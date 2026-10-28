import styles from "../../backend/data/company_styles.json";
import type { CompanyStyleId } from "@/types/contracts";

// Read straight from the backend's file so the Setup picker and the Planner never drift.
export interface CompanyStyle {
  id: CompanyStyleId;
  name: string;
  description: string;
}

export const COMPANY_STYLES: CompanyStyle[] = styles.map(({ id, name, description }) => ({
  id: id as CompanyStyleId,
  name,
  description,
}));
