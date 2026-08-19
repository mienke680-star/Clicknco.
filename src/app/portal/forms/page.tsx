import type { Metadata } from "next";
import { FormsClient } from "./forms-client";

export const metadata: Metadata = { title: "Forms" };

export default function FormsPage() {
  return <FormsClient />;
}
