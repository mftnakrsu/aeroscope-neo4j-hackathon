import { redirect } from "next/navigation";

// The landing page is the login screen. Anyone hitting the root gets bounced
// straight there so signed-in users land on /dashboard (via the login page's
// post-auth redirect) and everyone else sees the sign-in form.
export default function Home() {
  redirect("/login");
}
