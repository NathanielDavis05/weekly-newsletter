import Link from "next/link";
import { SiteMenu } from "./SiteMenu";

export function DetailHeader() {
  return (
    <header className="detail-header">
      <Link className="back-link" href="/">
        <span aria-hidden="true">←</span> This week
      </Link>
      <Link className="detail-brand" href="/" aria-label="CFA West Bryan home">
        CFA West Bryan
      </Link>
      <SiteMenu />
    </header>
  );
}
