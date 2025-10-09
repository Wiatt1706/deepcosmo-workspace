import { LoginForm } from "@/components/auth/login-form";
import { Navbar } from "@/components/layout/navbar";

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-4">
        <LoginForm />
      </div>
    </>
  );
}  