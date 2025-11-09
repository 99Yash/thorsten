import { ProfileForm } from '~/components/linkedin/profile-form';

export default function Home() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] w-full items-start justify-center px-4 py-8 lg:items-center lg:py-12">
      <ProfileForm />
    </main>
  );
}
