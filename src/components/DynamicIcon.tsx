import React from 'react';
import {
  Shield,
  MessageSquare,
  Newspaper,
  Users,
  LifeBuoy,
  FileText,
  Crown,
  BookOpen,
  Folder,
  Megaphone,
  Sparkles,
  FileCode,
  Calendar,
  MessagesSquare,
  UserCheck,
  HelpCircle,
  Image,
  Gamepad2,
  Layers,
  ShieldAlert,
  Car,
  Lightbulb,
  Bug,
  Wrench,
  Key,
  AlertTriangle,
  Award,
  Briefcase,
  Info,
  Sword,
  LucideIcon
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  Shield,
  MessageSquare,
  Newspaper,
  Users,
  LifeBuoy,
  FileText,
  Crown,
  BookOpen,
  Folder,
  Megaphone,
  Sparkles,
  FileCode,
  Calendar,
  MessagesSquare,
  UserCheck,
  HelpCircle,
  Image,
  Gamepad2,
  Layers,
  ShieldAlert,
  Car,
  Lightbulb,
  Bug,
  Wrench,
  Key,
  AlertTriangle,
  Award,
  Briefcase,
  Info,
  Sword,
};

interface DynamicIconProps {
  name: string;
  className?: string;
}

export default function DynamicIcon({ name, className = 'w-5 h-5' }: DynamicIconProps) {
  const IconComponent = icons[name] || MessageSquare;
  return <IconComponent className={className} />;
}
