import LandingPage from "@/components/landing/LandingPage";
import { getLatestApkDownloadUrl } from "@/lib/github";

export default async function Page() {
  const apkUrl = await getLatestApkDownloadUrl();

  return <LandingPage apkUrl={apkUrl} />;
}
