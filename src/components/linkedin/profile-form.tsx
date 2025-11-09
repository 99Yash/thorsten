'use client';

import * as React from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { extractLinkedInUsername, isLikelyUsername } from '~/lib/linkedin/parse';
import type { LinkedInRawProfile } from '~/lib/linkedin/schema';
import { ProfileCard } from '~/components/linkedin/profile-card';

const schema = z.object({
	input: z
		.string()
		.min(3, 'Please enter a LinkedIn profile URL or username')
		.refine(
			(val) => {
				const v = val.trim();
				if (!v) return false;
				// Valid if:
				// 1) It's a linkedin URL with a personal profile path
				try {
					const url = new URL(v.startsWith('http') ? v : `https://${v}`);
					const host = url.hostname.replace(/^www\./, '');
					if (/(^|\.)linkedin\.(com|cn)$/i.test(host)) {
						const p = url.pathname.toLowerCase();
						if (p.includes('/in/') || p.includes('/pub/') || p.split('/').includes('in')) {
							return true;
						}
					}
				} catch {
					// not a url
				}
				// 2) Or it looks like a username
				return isLikelyUsername(v);
			},
			{ message: 'Enter a valid LinkedIn personal profile URL or username' }
		),
});

type FormValues = z.infer<typeof schema>;

export function ProfileForm() {
	const [loading, setLoading] = React.useState(false);
	const [profile, setProfile] = React.useState<LinkedInRawProfile | null>(null);

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: { input: '' },
		mode: 'onTouched',
	});

	async function onSubmit(values: FormValues) {
		setLoading(true);
		setProfile(null);
		try {
			const username = extractLinkedInUsername(values.input) ?? values.input.trim();
			const res = await fetch('/api/linkedin', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ username }),
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data?.error || 'Failed to fetch profile');
			}
			setProfile(data.data as LinkedInRawProfile);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Something went wrong';
			toast.error('Could not fetch LinkedIn profile', { description: message });
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="w-full max-w-7xl">
			<div className="grid gap-6 lg:grid-cols-[400px_1fr]">
				{/* Form Card - Left Side */}
				<Card className="lg:self-start lg:sticky lg:top-6">
					<CardHeader className="text-left">
						<CardTitle>Import LinkedIn profile</CardTitle>
						<CardDescription>
							Paste a LinkedIn personal profile URL or username.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
								<FormField
									control={form.control}
									name="input"
									render={({ field }) => (
										<FormItem>
											<FormLabel>LinkedIn URL or username</FormLabel>
											<FormControl>
												<Input
													placeholder="linkedin.com/in/jane-doe"
													autoComplete="off"
													inputMode="url"
													{...field}
												/>
											</FormControl>
											<FormDescription className="text-xs">
												Client-side validation only.
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button type="submit" disabled={loading} className="w-full">
									{loading ? 'Fetching…' : 'Fetch profile'}
								</Button>
							</form>
						</Form>
					</CardContent>
				</Card>

				{/* Profile Card - Right Side */}
				<div className="min-h-[200px]">
					{loading ? (
						<div className="space-y-4">
							<Skeleton className="h-32 w-full rounded-lg" />
							<Skeleton className="h-64 w-full rounded-lg" />
							<Skeleton className="h-48 w-full rounded-lg" />
						</div>
					) : profile ? (
						<ProfileCard profile={profile} />
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


