import { DateRangePickerDemo } from "@/components/forms/DateRangePickerDemo";
import { requireAdminModule } from "@/lib/auth/require-admin-module";

export default async function DateRangeDemoPage() {
  await requireAdminModule("dashboard");

  return <DateRangePickerDemo />;
}
