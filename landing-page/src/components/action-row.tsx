import Image from "next/image";
import Link from "next/link";

import type { ActionLink } from "@/types/velora";

type ActionRowProps = {
  actions: ActionLink[];
  className?: string;
};

export function ActionRow({ actions, className }: ActionRowProps) {
  return (
    <div className={className}>
      {actions.map((action) => (
        <div className="velora-action" key={action.label}>
          <span className="velora-rule" />
          <Link className="velora-action-link magnet-effect" href={action.href}>
            <span>{action.label}</span>
            <Image
              src="/images/velora/icons/chevron-right.svg"
              alt=""
              width={24}
              height={24}
            />
          </Link>
        </div>
      ))}
    </div>
  );
}
