import { redirect } from "next/navigation";

// Redirects legacy /admin/users to the new /admin/clients page
export default function UsersRedirectPage() {
  redirect("/admin/clients");
}
