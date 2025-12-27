'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useQueryState } from 'nuqs';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ProfileCard } from '~/components/linkedin/profile-card';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { Modal } from '~/components/ui/modal';
import { Skeleton } from '~/components/ui/skeleton';
import {
  extractLinkedInUsername,
  isLikelyUsername,
} from '~/lib/linkedin/parse';
import type { LinkedInRawProfile } from '~/lib/linkedin/schema';

const schema = z.object({
  input: z
    .string()
    .min(3, 'Please enter a LinkedIn profile URL or username')
    .refine(
      (val) => {
        const v = val.trim();
        if (!v) return false;
        try {
          const url = new URL(v.startsWith('http') ? v : `https://${v}`);
          const host = url.hostname.replace(/^www\./, '');
          if (/(^|\.)linkedin\.(com|cn)$/i.test(host)) {
            const p = url.pathname.toLowerCase();
            if (
              p.includes('/in/') ||
              p.includes('/pub/') ||
              p.split('/').includes('in')
            ) {
              return true;
            }
          }
        } catch {}
        return isLikelyUsername(v);
      },
      { message: 'Enter a valid LinkedIn personal profile URL or username' }
    ),
});

type FormValues = z.infer<typeof schema>;

export function ProfileForm() {
  const [usernameParam, setUsernameParam] = useQueryState('username', {
    defaultValue: '',
    clearOnDefault: true,
  });
  const [loading, setLoading] = React.useState(false);
  const [profile, setProfile] = React.useState<LinkedInRawProfile | null>(null);
  const [lastAnalysedAt, setLastAnalysedAt] = React.useState<string | null>(
    null
  );
  const [showModal, setShowModal] = React.useState(false);
  const lastFetchedUsernameRef = React.useRef<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { input: '' },
    mode: 'onTouched',
  });

  React.useEffect(() => {
    if (usernameParam) {
      const currentInput = form.getValues().input;
      const extracted = extractLinkedInUsername(usernameParam) ?? usernameParam;
      if (
        extracted !== currentInput &&
        extracted !== lastFetchedUsernameRef.current
      ) {
        form.setValue('input', usernameParam);
      }
    }
  }, [usernameParam, form]);

  // Auto-fetch profiles when a ?username=... query parameter is present.
  //
  // This effect runs whenever the URL `username` query param changes. If the
  // value looks like a valid LinkedIn username, we normalise it (via
  // `extractLinkedInUsername`) and trigger `fetchProfile` exactly once for
  // each distinct username. The `lastFetchedUsernameRef` guard prevents
  // redundant refetches when the same username is already loaded (for example,
  // when the component remounts or the input field is updated programmatically).
  //
  // When the `username` query param is cleared, we reset the currently shown
  // profile and its analysis timestamp. The dependency array is intentionally
  // limited to `[usernameParam]` so that form or state updates inside this
  // effect do not cause additional, unintended fetches.
  React.useEffect(() => {
    if (usernameParam && isLikelyUsername(usernameParam)) {
      const extracted = extractLinkedInUsername(usernameParam) ?? usernameParam;
      if (extracted !== lastFetchedUsernameRef.current) {
        fetchProfile({ input: usernameParam }, false);
      }
    } else if (!usernameParam) {
      setProfile(null);
      setLastAnalysedAt(null);
      lastFetchedUsernameRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameParam]);

  async function fetchProfile(values: FormValues, forceRefresh = false) {
    setLoading(true);
    setProfile(null);
    setLastAnalysedAt(null);
    try {
      const username =
        extractLinkedInUsername(values.input) ?? values.input.trim();

      if (!username || !isLikelyUsername(username)) {
        throw new Error('Invalid LinkedIn username');
      }

      lastFetchedUsernameRef.current = username;

      // Update the `username` query parameter in the URL so the current
      // analysed username is reflected in navigation and other effects.
      await setUsernameParam(username);

      const res = await fetch('/api/linkedin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, forceRefresh }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch profile');
      }
      setProfile(data.data as LinkedInRawProfile);
      setLastAnalysedAt(data.lastAnalysedAt || null);
      setShowModal(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Could not fetch LinkedIn profile', { description: message });
      await setUsernameParam(null);
      lastFetchedUsernameRef.current = null;
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = (values: FormValues) => {
    return fetchProfile(values, false);
  };

  return (
    <div className="w-full max-w-7xl">
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setShowModal(true);
              form.reset({ input: '' });
            }}
            className="gap-2"
          >
            <Plus className="size-4" />
            Import LinkedIn profile
          </Button>
        </div>

        <Modal
          showModal={showModal}
          setShowModal={setShowModal}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }}
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="text-left">
              <CardTitle>Import LinkedIn profile</CardTitle>
              <CardDescription>
                Paste a LinkedIn personal profile URL or username.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="input"
                    render={({ field }) => {
                      const { ref: fieldRef, ...fieldProps } = field;
                      return (
                        <FormItem>
                          <FormLabel>LinkedIn URL or username</FormLabel>
                          <FormControl>
                            <Input
                              ref={(e) => {
                                fieldRef(e);
                                inputRef.current = e;
                              }}
                              placeholder="linkedin.com/in/jane-doe"
                              autoComplete="off"
                              inputMode="url"
                              {...fieldProps}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Client-side validation only.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Fetching…' : 'Fetch profile'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </Modal>

        <div className="min-h-[200px]">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ) : profile ? (
            <ProfileCard
              profile={profile}
              lastAnalysedAt={lastAnalysedAt}
              onRescrape={() => fetchProfile(form.getValues(), true)}
              isRescraping={loading}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex min-h-[300px] items-center justify-center p-6">
                <p className="text-muted-foreground text-center text-sm">
                  Enter a LinkedIn profile URL or username to get started
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
