import BusinessCardV1 from "./business-card-v1";
import SellerV1 from "./seller-v1";
import DeveloperV1 from "./developer-v1";
import { ProfileData } from "../types";

export function renderTemplate(profile: ProfileData) {
  switch (profile.templateId) {
    case "business_card_v1":
      return <BusinessCardV1 profile={profile} />;

    case "seller_v1":
      return <SellerV1 profile={profile} />;

    case "developer_v1":
      return <DeveloperV1 profile={profile} />;

    default:
      return <BusinessCardV1 profile={profile} />;
  }
}
