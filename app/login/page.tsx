import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { roleHome } from "@/lib/roles";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(roleHome(user.role));

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-ember-500 text-2xl font-black text-coal-950 shadow-lg shadow-ember-500/20">
            BM
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Burgershot Mirrorpark</h1>
          <p className="mt-1 text-sm text-ink-dim">Kassensystem · Mitarbeiter-Login</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-ink-dim/70">
          Demo: <span className="font-mono">admin / admin123</span> · <span className="font-mono">max / demo123</span> · <span className="font-mono">koch / kueche123</span>
        </p>
      </div>
    </main>
  );
}