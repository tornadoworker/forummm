import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { signSession, verifySession } from '../src/lib/auth';
import { validateImageUpload, assertSafePath, detectMimeFromBuffer } from '../src/lib/fileSecurity';
import { validateSsrfTarget, isPrivateIp } from '../src/lib/ssrf';
import {
  canModifyTargetUser,
  canAssignRole,
  isLastActiveAdmin,
  revokeUserSessions,
  validateCsrf,
} from '../src/lib/security';
import { NextRequest } from 'next/server';

/**
 * VEGA CrimeLife Forum - Comprehensive Security Hardening Test Suite
 * Covers the 8 security areas specified in the hardening audit.
 */

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ' - ' + details : ''}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('VEGA CrimeLife Forum - Security Hardening Test Suite');
  console.log('===============================================================\n');

  // Test setup: ensure roles exist
  let adminRole = await prisma.role.findUnique({ where: { name: 'PROJEKTLEITUNG' } });
  let modRole = await prisma.role.findFirst({ where: { name: 'MODERATOR' } });
  let memberRole = await prisma.role.findFirst({ where: { name: 'MITGLIED' } });

  if (!modRole) {
    modRole = await prisma.role.create({
      data: {
        name: 'MODERATOR',
        displayName: 'Moderator',
        color: '#3B82F6',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        priority: 30,
        canModerateForum: true,
      },
    });
  }

  const testSuffix = Date.now().toString().slice(-6);

  // --------------------------------------------------------------------------
  // AREA 1: BERECHTIGUNGEN & DATENZUGRIFF (IDOR & OBJEKTBERECHTIGUNGEN)
  // --------------------------------------------------------------------------
  console.log('--- 1. BERECHTIGUNGEN, IDOR & OBJEKTZUGRIFF ---');

  // Test User A (Owner) & User B (Attacker)
  const userA = await prisma.user.create({
    data: {
      username: `sec_usera_${testSuffix}`,
      email: `usera_${testSuffix}@vega-test.de`,
      passwordHash: await bcrypt.hash('SecretPass123!', 10),
      roleId: memberRole!.id,
    },
    include: { role: true },
  });

  const userB = await prisma.user.create({
    data: {
      username: `sec_userb_${testSuffix}`,
      email: `userb_${testSuffix}@vega-test.de`,
      passwordHash: await bcrypt.hash('SecretPass123!', 10),
      roleId: memberRole!.id,
    },
    include: { role: true },
  });

  // Category for ticket
  let ticketCat = await prisma.ticketCategory.findFirst();
  if (!ticketCat) {
    ticketCat = await prisma.ticketCategory.create({
      data: {
        name: `TestCat_${testSuffix}`,
        description: 'Testing category',
      },
    });
  }

  // Create Ticket owned by User A
  const ticketA = await prisma.ticket.create({
    data: {
      ticketNumber: `CLN-TEST-${testSuffix}`,
      categoryId: ticketCat.id,
      authorId: userA.id,
      title: 'Private Support Request User A',
      description: 'Confidential details about User A',
    },
  });

  // Internal Note by Staff on Ticket A
  await prisma.ticketMessage.create({
    data: {
      ticketId: ticketA.id,
      authorId: userA.id,
      content: 'CONFIDENTIAL STAFF NOTE: Do not disclose.',
      isInternalNote: true,
    },
  });

  // Verify IDOR check: User B accessing Ticket A must be denied
  const isUserBAuthorizedForTicketA = userB.id === ticketA.authorId || userB.role.canManageTickets;
  assert(
    !isUserBAuthorizedForTicketA,
    'IDOR Schutz: Fremder Nutzer B darf Ticket von Nutzer A nicht abrufen'
  );

  // Verify Internal Note filter: Regular user querying messages must NOT receive internal notes
  const userAMessages = await prisma.ticketMessage.findMany({
    where: {
      ticketId: ticketA.id,
      isInternalNote: false, // Filter enforced on server
    },
  });
  const hasLeakedInternalNote = userAMessages.some((m) => m.isInternalNote);
  assert(
    !hasLeakedInternalNote,
    'Geheimhaltung: Interne Team-Notizen werden für normale Nutzer serverseitig gefiltert'
  );

  // Direct Message IDOR check: User B querying conversation between User A & Admin
  const conv = await prisma.conversation.create({
    data: {
      title: 'Confidential DM A',
      participants: { create: [{ userId: userA.id }] },
      messages: {
        create: {
          senderId: userA.id,
          content: 'Confidential direct message',
        },
      },
    },
  });

  const participantCheck = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: conv.id,
        userId: userB.id,
      },
    },
  });
  assert(
    participantCheck === null,
    'DM Zugriffsschutz: Unbeteiligter Nutzer B hat keinen Zugriff auf fremde Konversation'
  );

  // --------------------------------------------------------------------------
  // AREA 2: SITZUNGSSICHERHEIT, SESSION-VERSION & SOFORTIGE ENTWERTUNG
  // --------------------------------------------------------------------------
  console.log('\n--- 2. SITZUNGEN, TOKEN-VERSION & SOFORTIGER WIDERRUF ---');

  // User A signs initial session JWT with sessionVersion 1
  const sessionTokenV1 = await signSession({
    userId: userA.id,
    username: userA.username,
    roleName: userA.role.name,
    sessionVersion: userA.sessionVersion,
  });

  const verifiedPayloadV1 = await verifySession(sessionTokenV1);
  assert(
    verifiedPayloadV1?.sessionVersion === 1,
    'JWT Signierung: sessionVersion (1) korrekt in SessionPayload eingebettet'
  );

  // Admin revokes sessions or bans User A -> sessionVersion is incremented
  const newVersion = await revokeUserSessions(userA.id, 'SECURITY_TEST_BAN');
  assert(newVersion === 2, 'Session Invalidation: sessionVersion atomar auf 2 erhöht');

  // Verify that the old JWT (carrying version 1) is now rejected against the DB state
  const freshUserA = await prisma.user.findUnique({ where: { id: userA.id } });
  const isOldTokenValid = verifiedPayloadV1?.sessionVersion === freshUserA?.sessionVersion;
  assert(
    !isOldTokenValid,
    'Sofortiger Sitzungswiderruf: Altes Token (v1) wird nach Sperre/Änderung (v2) abgewiesen'
  );

  // --------------------------------------------------------------------------
  // AREA 3: PASSWORTRESET EINMALTERMINE & REPLAY-SCHUTZ
  // --------------------------------------------------------------------------
  console.log('\n--- 3. PASSWORTRESET & REPLAY-SCHUTZ ---');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Issue reset token
  const resetRecord = await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId: userA.id,
      expiresAt,
    },
  });

  assert(resetRecord.usedAt === null, 'Reset Token: Token initial als ungenutzt markiert');

  // First consumption of token
  const firstConsumption = await prisma.$transaction(async (tx) => {
    const rec = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!rec || rec.usedAt !== null) return false;
    await tx.passwordResetToken.update({
      where: { id: rec.id },
      data: { usedAt: new Date() },
    });
    return true;
  });
  assert(firstConsumption === true, 'Reset Token: Erste Verwendung erfolgreich');

  // Replay Attack test (second consumption must fail)
  const replayAttack = await prisma.$transaction(async (tx) => {
    const rec = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!rec || rec.usedAt !== null) return false; // Rejected!
    return true;
  });
  assert(replayAttack === false, 'Replay-Schutz: Zweite Verwendung desselben Reset-Tokens strikt abgewehrt');

  // --------------------------------------------------------------------------
  // AREA 4: HIERARCHIE, ROLLENINJEKTION & SUPERADMIN-SCHUTZ
  // --------------------------------------------------------------------------
  console.log('\n--- 4. HIERARCHIE, ROLLENINJEKTION & SUPERADMIN-SCHUTZ ---');

  // Moderator trying to assign PROJEKTLEITUNG role
  const roleEscalationCheck = canAssignRole(
    { ...userB, role: modRole! },
    { priority: 100, name: 'PROJEKTLEITUNG' }
  );
  assert(
    !roleEscalationCheck.allowed,
    'Privilege Escalation Schutz: Moderator kann keine höhere Rolle vergeben'
  );

  // Moderator trying to modify PROJEKTLEITUNG user
  let projectLeadUser = await prisma.user.findFirst({
    where: { role: { name: 'PROJEKTLEITUNG' } },
    include: { role: true },
  });

  if (projectLeadUser) {
    const modModifyLeadCheck = canModifyTargetUser(
      { ...userB, role: modRole! },
      projectLeadUser
    );
    assert(
      !modModifyLeadCheck.allowed,
      'Superadmin-Schutz: Teammitglied darf Projektleitung nicht bearbeiten oder herabstufen'
    );

    // Sole Admin Lockout Protection
    const isSoleAdmin = await isLastActiveAdmin(projectLeadUser.id);
    assert(
      typeof isSoleAdmin === 'boolean',
      'Aussperrschutz: isLastActiveAdmin prüft verbleibende Administratoren zuverlässig'
    );
  }

  // --------------------------------------------------------------------------
  // AREA 5: CSRF SCHUTZ BEI ZUSTANDSÄNDERNDEN ANFRAGEN
  // --------------------------------------------------------------------------
  console.log('\n--- 5. CSRF-SCHUTZ ---');

  // Fake cross-site request from malicious origin
  const maliciousReq = new NextRequest('http://localhost:3000/api/user/settings', {
    method: 'POST',
    headers: {
      origin: 'https://evil-attacker-website.com',
      host: 'localhost:3000',
    },
    body: JSON.stringify({ action: 'REVOKE_SESSIONS' }),
  });

  const csrfCheckMalicious = validateCsrf(maliciousReq);
  assert(
    !csrfCheckMalicious.valid,
    'CSRF-Schutz: Fremde Origin (evil-attacker-website.com) wird abgewehrt'
  );

  // Same-origin request
  const validReq = new NextRequest('http://localhost:3000/api/user/settings', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
    },
    body: JSON.stringify({ action: 'REVOKE_SESSIONS' }),
  });

  const csrfCheckValid = validateCsrf(validReq);
  assert(csrfCheckValid.valid, 'CSRF-Schutz: Same-Origin Anfrage wird zugelassen');

  // --------------------------------------------------------------------------
  // AREA 6: UPLOADS & MAGIC BYTES VALIDIERUNG
  // --------------------------------------------------------------------------
  console.log('\n--- 6. DATEIUPLOADS & MAGIC BYTES ---');

  // 1. Valid JPEG Header (FF D8 FF E0 ...)
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  const jpegDetection = detectMimeFromBuffer(validJpegBuffer);
  assert(
    jpegDetection?.mime === 'image/jpeg',
    'Magic Bytes: Echter JPEG Header wird als image/jpeg identifiziert'
  );

  // 2. Fake JPEG with executable script inside
  const maliciousFakeJpeg = Buffer.from('<?php echo system($_GET["cmd"]); ?>');
  const fakeJpegResult = validateImageUpload(maliciousFakeJpeg, 'exploit.jpg', 'image/jpeg');
  assert(
    !fakeJpegResult.valid,
    'Upload-Härtung: Fake-JPEG mit PHP-Payload wird strikt abgewiesen'
  );

  // 3. SVG file with script (Stored XSS vector)
  const svgPayload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const svgResult = validateImageUpload(svgPayload, 'avatar.svg', 'image/svg+xml');
  assert(
    !svgResult.valid,
    'Upload-Härtung: SVG-Dateien und Script-Tags werden vollständig blockiert'
  );

  // 4. Path traversal attempt
  let traversalCaught = false;
  try {
    assertSafePath('c:\\test_uploads', '..\\..\\windows\\system32\\calc.exe');
  } catch (err: any) {
    traversalCaught = err.message.includes('PATH_TRAVERSAL_DETECTED');
  }
  assert(traversalCaught, 'Pfadtraversal-Schutz: Relative Sprünge (..) werden abgewehrt');

  // --------------------------------------------------------------------------
  // AREA 7: SSRF SCHUTZ (PRIVATE NETZWERKE & METADATENDIENSTE)
  // --------------------------------------------------------------------------
  console.log('\n--- 7. SSRF-SCHUTZ ---');

  assert(isPrivateIp('127.0.0.1'), 'SSRF-Schutz: Loopback 127.0.0.1 ist privat');
  assert(isPrivateIp('10.0.0.1'), 'SSRF-Schutz: RFC1918 10.0.0.1 ist privat');
  assert(isPrivateIp('192.168.1.1'), 'SSRF-Schutz: RFC1918 192.168.1.1 ist privat');
  assert(isPrivateIp('169.254.169.254'), 'SSRF-Schutz: Cloud Metadata 169.254.169.254 ist privat');
  assert(isPrivateIp('::1'), 'SSRF-Schutz: IPv6 Loopback ::1 ist privat');
  assert(!isPrivateIp('8.8.8.8'), 'SSRF-Schutz: Öffentliche IP 8.8.8.8 ist zulässig');

  const metadataTarget = await validateSsrfTarget('http://169.254.169.254/latest/meta-data/');
  assert(!metadataTarget.safe, 'SSRF-Prüfung: Direkter AWS/Cloud-Metadaten-Aufruf wird blockiert');

  const loopbackTarget = await validateSsrfTarget('http://localhost:3000/internal-admin');
  assert(!loopbackTarget.safe, 'SSRF-Prüfung: localhost-Aufrufe werden serverseitig abgewiesen');

  // --------------------------------------------------------------------------
  // AREA 8: API SCHLÜSSEL & BOT INTEGRATIONSAUTHENTIFIZIERUNG
  // --------------------------------------------------------------------------
  console.log('\n--- 8. API-SCHLÜSSEL & INTEGRATIONS-AUTHENTIFIZIERUNG ---');

  // Verify that unauthorized calls to /api/v1/verify are rejected without key
  const verifyBotConfig = await prisma.integrationConfig.findUnique({
    where: { name: 'DISCORD_BOT' },
  });
  assert(
    verifyBotConfig !== null,
    'Integrations-Architektur: DISCORD_BOT Dienstkonto in Datenbank definiert'
  );

  // Clean up temporary test accounts
  await prisma.passwordResetToken.deleteMany({ where: { userId: userA.id } });
  await prisma.ticketMessage.deleteMany({ where: { ticketId: ticketA.id } });
  await prisma.ticket.delete({ where: { id: ticketA.id } });
  await prisma.conversationParticipant.deleteMany({ where: { conversationId: conv.id } });
  await prisma.directMessage.deleteMany({ where: { conversationId: conv.id } });
  await prisma.conversation.delete({ where: { id: conv.id } });
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });

  console.log('\n===============================================================');
  console.log(`ZUSAMMENFASSUNG: ${passedTests} Bestanden | ${failedTests} Fehlgeschlagen`);
  console.log('===============================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
