import Link from "next/link";
import type { SharedContent } from "../content/types";
import { SiteMenu } from "./SiteMenu";

export function DetailHeader({ shared }: { shared: SharedContent }) {
  return (
    <header className="detail-header">
      <Link className="back-link" href="/">
        <span aria-hidden="true">←</span> {shared.detailBackLabel}
      </Link>
      <Link className="detail-brand" href="/" aria-label={`${shared.brandName} home`}>
        {shared.brandName}
      </Link>
      <SiteMenu heading={shared.navHeading} links={shared.navLinks} />
    </header>
  );
}
