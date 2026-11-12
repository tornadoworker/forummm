import { CaptchaService } from '../src/lib/captcha/service';
import { prisma } from '../src/lib/prisma';
import { generateCaptchaPng } from '../src/lib/captcha/imageGenerator';
import { generateCaptchaWav } from '../src/lib/captcha/audioGenerator';
import { verifyAnswerHmac, hashAnswer } from '../src/lib/captcha/crypto';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`, detail !== undefined ? detail : '');
  }
}

async function runCaptchaTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 VEGA CrimeLife — Hauseigenes CAPTCHA Test-Suite');
  console.log('======================================================\n');

  // Test 1: Richtige und falsche Antworten
  console.log('--- Testfall 1: Richtige & falsche Antworten ---');
  {
    const challenge = await CaptchaService.createChallenge({
      action: 'REGISTER',
      sessionId: 'test_sess_1',
      ipAddress: '127.0.0.1',
    });
    const code = await CaptchaService.getCodeForRendering(challenge.challengeId);
    assert(typeof code === 'string' && code.length >= 5, 'Challenge-Code generiert (5-6 Zeichen)');

    const wrongRes = await CaptchaService.verifyCaptcha({
      challengeId: challenge.challengeId,
      response: 'INVAL1',
      action: 'REGISTER',
      sessionId: 'test_sess_1',
    });
    assert(!wrongRes.success && wrongRes.error === 'CAPTCHA_INCORRECT', 'Falsche Antwort abgelehnt');

    // Groß- und Kleinschreibung ignorieren
    const rightRes = await CaptchaService.verifyCaptcha({
      challengeId: challenge.challengeId,
      response: code!.toLowerCase(),
      action: 'REGISTER',
      sessionId: 'test_sess_1',
    });
    assert(rightRes.success === true, 'Richtige Antwort (in Kleinbuchstaben) akzeptiert');
  }

  // Test 2: Ablauf und Versuchslimit (Max 5 Versuche)
  console.log('\n--- Testfall 2: Ablauf & Versuchslimit ---');
  {
    const challenge = await CaptchaService.createChallenge({
      action: 'REGISTER',
      sessionId: 'test_sess_attempts',
      ipAddress: '127.0.0.1',
    });

    for (let i = 1; i <= 4; i++) {
      const res = await CaptchaService.verifyCaptcha({
        challengeId: challenge.challengeId,
        response: `WRONG_${i}`,
        action: 'REGISTER',
        sessionId: 'test_sess_attempts',
      });
      assert(!res.success && res.error === 'CAPTCHA_INCORRECT', `Fehlversuch #${i} abgelehnt`);
    }

    // 5. Fehlversuch muss Limit erreichen
    const finalRes = await CaptchaService.verifyCaptcha({
      challengeId: challenge.challengeId,
      response: 'WRONG_5',
      action: 'REGISTER',
      sessionId: 'test_sess_attempts',
    });
    assert(!finalRes.success && finalRes.error === 'CAPTCHA_MAX_ATTEMPTS', '5. Fehlversuch erreicht maxAttempts und sperrt Aufgabe');

    // Abgelaufene Challenge testen
    const expiredChallenge = await CaptchaService.createChallenge({
      action: 'LOGIN',
      sessionId: 'test_sess_exp',
      ipAddress: '127.0.0.1',
    });
    // Manuell in DB auf Vergangenheit setzen
    await prisma.captchaChallenge.update({
      where: { challengeId: expiredChallenge.challengeId },
      data: { expiresAt: new Date(Date.now() - 10000) },
    });
    const expRes = await CaptchaService.verifyCaptcha({
      challengeId: expiredChallenge.challengeId,
      response: 'ANYCODE',
      action: 'LOGIN',
      sessionId: 'test_sess_exp',
    });
    assert(!expRes.success && expRes.error === 'CAPTCHA_EXPIRED', 'Abgelaufene Challenge wird abgelehnt');
  }

  // Test 3: Erneuerung und Wiederverwendung (Replay-Schutz)
  console.log('\n--- Testfall 3: Erneuerung & Wiederverwendungsschutz ---');
  {
    const ch1 = await CaptchaService.createChallenge({
      action: 'FORGOT_PASSWORD',
      sessionId: 'test_sess_renew',
      ipAddress: '127.0.0.1',
    });
    const code1 = await CaptchaService.getCodeForRendering(ch1.challengeId);

    // Neue Challenge derselben Session anfordern
    const ch2 = await CaptchaService.createChallenge({
      action: 'FORGOT_PASSWORD',
      sessionId: 'test_sess_renew',
      ipAddress: '127.0.0.1',
    });

    // Alte Challenge muss jetzt entwertet sein
    const oldRenewRes = await CaptchaService.verifyCaptcha({
      challengeId: ch1.challengeId,
      response: code1!,
      action: 'FORGOT_PASSWORD',
      sessionId: 'test_sess_renew',
    });
    assert(
      !oldRenewRes.success && (oldRenewRes.error === 'CAPTCHA_ALREADY_USED' || oldRenewRes.error === 'CAPTCHA_NOT_FOUND'),
      'Vorherige Aufgabe bei Erneuerung entwertet',
      oldRenewRes
    );

    // Neue Challenge lösen
    const code2 = await CaptchaService.getCodeForRendering(ch2.challengeId);
    const newSolveRes = await CaptchaService.verifyCaptcha({
      challengeId: ch2.challengeId,
      response: code2!,
      action: 'FORGOT_PASSWORD',
      sessionId: 'test_sess_renew',
    });
    assert(newSolveRes.success === true, 'Neue Aufgabe erfolgreich gelöst');

    // Replay versuchen
    const replayRes = await CaptchaService.verifyCaptcha({
      challengeId: ch2.challengeId,
      response: code2!,
      action: 'FORGOT_PASSWORD',
      sessionId: 'test_sess_renew',
    });
    assert(!replayRes.success && replayRes.error === 'CAPTCHA_ALREADY_USED', 'Replay einer gelösten Challenge verhindert');
  }

  // Test 4: Nutzung aus anderer Sitzung oder für andere Aktion
  console.log('\n--- Testfall 4: Sitzungs- & Aktionsbindung ---');
  {
    // Test 4a: Fremde Session
    const chSession = await CaptchaService.createChallenge({
      action: 'REGISTER',
      sessionId: 'session_A',
      ipAddress: '127.0.0.1',
    });
    const codeSession = await CaptchaService.getCodeForRendering(chSession.challengeId);

    const otherSessRes = await CaptchaService.verifyCaptcha({
      challengeId: chSession.challengeId,
      response: codeSession!,
      action: 'REGISTER',
      sessionId: 'session_B',
    });
    assert(!otherSessRes.success && otherSessRes.error === 'CAPTCHA_SESSION_MISMATCH', 'Fremde Session abgelehnt');

    // Test 4b: Falsche Aktion
    const chAction = await CaptchaService.createChallenge({
      action: 'REGISTER',
      sessionId: 'session_C',
      ipAddress: '127.0.0.1',
    });
    const codeAction = await CaptchaService.getCodeForRendering(chAction.challengeId);

    const otherActionRes = await CaptchaService.verifyCaptcha({
      challengeId: chAction.challengeId,
      response: codeAction!,
      action: 'LOGIN',
      sessionId: 'session_C',
    });
    assert(!otherActionRes.success && otherActionRes.error === 'CAPTCHA_SESSION_MISMATCH', 'Falsche Aktion abgelehnt', otherActionRes);
  }

  // Test 5: Gleichzeitige Anfragen (Race Conditions)
  console.log('\n--- Testfall 5: Atomare Ausführung bei parallelen Anfragen ---');
  {
    const ch = await CaptchaService.createChallenge({
      action: 'REGISTER',
      sessionId: 'sess_race',
      ipAddress: '127.0.0.1',
    });
    const code = await CaptchaService.getCodeForRendering(ch.challengeId);

    // 5 parallele gleichzeitige Anfragen mit der richtigen Lösung
    const promises = Array.from({ length: 5 }).map(() =>
      CaptchaService.verifyCaptcha({
        challengeId: ch.challengeId,
        response: code!,
        action: 'REGISTER',
        sessionId: 'sess_race',
      })
    );

    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    assert(successCount === 1, 'Exakt 1 parallele Anfrage war erfolgreich');
    assert(failCount === 4, 'Alle 4 anderen parallelen Anfragen wurden abgewiesen');
  }

  // Test 6: Bild & Audio Synthese
  console.log('\n--- Testfall 6: Lokale Bild- und Audio-Synthese ---');
  {
    const pngBuf = generateCaptchaPng('27K9PZ');
    assert(Buffer.isBuffer(pngBuf) && pngBuf.length > 1000, 'PNG Bild erfolgreich generiert (> 1 KB)');
    assert(pngBuf.subarray(1, 4).toString() === 'PNG', 'Valider PNG-Header (magic bytes)');

    const wavBuf = generateCaptchaWav('27K9PZ');
    assert(Buffer.isBuffer(wavBuf) && wavBuf.length > 50000, 'WAV Audio erfolgreich generiert (> 50 KB)');
    assert(wavBuf.subarray(0, 4).toString() === 'RIFF', 'Valider RIFF WAVE Header');
    assert(wavBuf.subarray(8, 12).toString() === 'WAVE', 'Valider WAVE Audio Identifikator');
  }

  // Test 7: HMAC Integrität
  console.log('\n--- Testfall 7: Kryptografische HMAC-Integrität ---');
  {
    const h1 = hashAnswer('abcde');
    const h2 = hashAnswer('ABCDE');
    assert(h1 === h2, 'HMAC ist case-insensitive (Groß-/Kleinschreibung)');
    assert(verifyAnswerHmac('AbCdE', h1), 'verifyAnswerHmac mit Mixed-Case erfolgreich');
    assert(!verifyAnswerHmac('AbCdF', h1), 'verifyAnswerHmac mit abweichendem Zeichen abgewiesen');
  }

  console.log('\n======================================================');
  console.log(`🏁 ERGEBNIS: ${passedTests} von ${totalTests} Tests bestanden!`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runCaptchaTestSuite().catch((e) => {
  console.error('Test suite failed:', e);
  process.exit(1);
});
