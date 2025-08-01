import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <AuthForm mode="signup" />
    </div>
  );
}
