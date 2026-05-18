export type NavItem = {
  label: string;
  href: string;
  cta?: boolean;
};

export type ActionLink = {
  label: string;
  href: string;
};

export type CapabilityColumn = {
  title: string;
  items: string[];
};

export type ScheduleTextItem = {
  name: string;
  href: string;
  paragraphs: string[];
};

export type ContactAction = {
  title: string;
  label: string;
  href: string;
};
