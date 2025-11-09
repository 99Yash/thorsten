'use client';

import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import type { LinkedInRawProfile } from '~/lib/linkedin/schema';

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'LN';
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function formatDatePart(
  d?: { year?: number; month?: number; day?: number } | null
) {
  if (!d || !d.year) return undefined;
  const month = d.month ? String(d.month).padStart(2, '0') : undefined;
  return month ? `${d.year}-${month}` : String(d.year);
}

export function ProfileCard({ profile }: { profile: LinkedInRawProfile }) {
  const [showRawJson, setShowRawJson] = React.useState(false);
  
  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const username = profile.username ?? '';
  const title = (fullName || username || 'LinkedIn User').trim();
  const location =
    profile.geo?.full ||
    [profile.geo?.city, profile.geo?.country].filter(Boolean).join(', ') ||
    undefined;
  const avatarUrl =
    profile.profilePicture || profile.profilePictures?.[0]?.url || undefined;
  const linkedinUrl = username
    ? `https://www.linkedin.com/in/${username}`
    : undefined;

  const positions = (profile.fullPositions ?? profile.position ?? []).slice();
  // Sort with current/most recent first
  const yearVal = (y?: number | null) =>
    typeof y === 'number' && y > 0 ? y : undefined;
  positions.sort((a, b) => {
    // Current roles often have no end date
    const aEnd = yearVal(a.end?.year) ?? 9999;
    const bEnd = yearVal(b.end?.year) ?? 9999;
    if (aEnd !== bEnd) return bEnd - aEnd;
    const aStart = yearVal(a.start?.year) ?? 0;
    const bStart = yearVal(b.start?.year) ?? 0;
    return bStart - aStart;
  });

  const current = positions.find((p) => !p.end?.year);
  const allExperience = positions;
  const skills = (profile.skills ?? [])
    .map((s) => s?.name?.trim())
    .filter(Boolean) as string[];
  const educations = profile.educations ?? [];
  const languages = profile.languages ?? [];
  const projectItems =
    Array.isArray((profile as any).projects)
      ? (((profile as any).projects as any[]) ?? [])
      : Array.isArray((profile as any).projects?.items)
      ? ((((profile as any).projects?.items as any[]) ?? []) as any[])
      : [];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start gap-4 pb-4">
        <Avatar className="size-16">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={title} />
          ) : (
            <AvatarFallback>{initialsOf(title)}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
              {profile.headline ? (
                <CardDescription className="mt-1">
                  {profile.headline}
                </CardDescription>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRawJson(!showRawJson)}
              className="shrink-0"
            >
              {showRawJson ? 'View Profile' : 'View JSON'}
            </Button>
          </div>
          {location ? (
            <p className="text-muted-foreground mt-1 text-sm">{location}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.isPremium ? <Badge>Premium</Badge> : null}
            {profile.isOpenToWork ? (
              <Badge variant="secondary">Open to work</Badge>
            ) : null}
            {profile.isHiring ? <Badge variant="outline">Hiring</Badge> : null}
          </div>
          <div className="mt-2 text-xs">
            {linkedinUrl ? (
              <a
                className="text-muted-foreground hover:text-foreground underline underline-offset-4"
                href={linkedinUrl}
                target="_blank"
                rel="noreferrer"
              >
                @{username}
              </a>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {showRawJson ? (
          <ScrollArea className="h-[600px] w-full">
            <pre className="bg-muted rounded-lg p-4 text-xs whitespace-pre-wrap break-words overflow-wrap-anywhere">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </ScrollArea>
        ) : (
          <>
        {profile.summary ? (
          <section>
            <h3 className="mb-2 text-sm font-medium text-foreground">About</h3>
            <p className="text-sm leading-relaxed">{profile.summary}</p>
          </section>
        ) : null}

        {profile.profilePictures?.length ? (
          <section>
            <h3 className="mb-2 text-sm font-medium text-foreground">
              Profile media
            </h3>
            <ScrollArea className="w-full">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {profile.profilePictures
                  .filter((img) => !!img?.url)
                  .map((img, idx) => {
                  const w = img.width ?? 80;
                  const h = img.height ?? 80;
                  return (
                    // Using native img to avoid Next Image layout shifts for unknown remote hosts
                    <img
                      key={idx}
                      src={img.url}
                      alt={`profile-image-${idx + 1}`}
                      className="h-20 w-20 shrink-0 rounded-md object-cover"
                      width={w}
                      height={h}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          </section>
        ) : null}

        {current ? (
          <section>
            <h3 className="mb-2 text-sm font-medium text-foreground">
              Current role
            </h3>
            <div className="rounded-md border p-3.5">
              <div className="flex items-start gap-3">
                {current.companyLogo ? (
                  <Avatar className="size-9">
                    <AvatarImage
                      src={current.companyLogo}
                      alt={current.companyName ?? 'Company logo'}
                    />
                    <AvatarFallback>
                      {initialsOf(current.companyName ?? 'Company')}
                    </AvatarFallback>
                  </Avatar>
                ) : current.companyName ? (
                  <div className="size-9 shrink-0 rounded-md bg-muted text-xs font-medium flex items-center justify-center">
                    {initialsOf(current.companyName)}
                  </div>
                ) : null}
                <div className="flex-1">
                  <p className="font-medium">
                    {current.title || '—'}{' '}
                    {current.companyName ? (
                      current.companyURL ? (
                        <a
                          className="text-muted-foreground hover:text-foreground underline underline-offset-4"
                          href={current.companyURL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          @ {current.companyName}
                        </a>
                      ) : (
                        `@ ${current.companyName}`
                      )
                    ) : (
                      ''
                    )}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {[current.location, current.employmentType]
                      .filter(Boolean)
                      .join(' • ') || '—'}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {[
                      formatDatePart(current.start),
                      '–',
                      formatDatePart(current.end) ?? 'Present',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                  {current.description ? (
                    <p className="mt-2 text-sm">{current.description}</p>
                  ) : null}
                  <div className="text-muted-foreground mt-2 text-xs">
                    {[
                      current.companyIndustry,
                      current.companyStaffCountRange
                        ? `Staff: ${current.companyStaffCountRange}`
                        : undefined,
                      current.locationType,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {allExperience.length ? (
          <section>
            <h3 className="mb-2 text-sm font-medium text-foreground">
              Experience
            </h3>
            <div className="space-y-2.5">
              {allExperience.map((role, idx) => (
                <div key={idx} className="rounded-md border p-3.5">
                  <div className="flex items-start gap-3">
                    {role.companyLogo ? (
                      <Avatar className="size-9">
                        <AvatarImage
                          src={role.companyLogo}
                          alt={role.companyName ?? 'Company logo'}
                        />
                        <AvatarFallback>
                          {initialsOf(role.companyName ?? 'Company')}
                        </AvatarFallback>
                      </Avatar>
                    ) : role.companyName ? (
                      <div className="size-9 shrink-0 rounded-md bg-muted text-xs font-medium flex items-center justify-center">
                        {initialsOf(role.companyName)}
                      </div>
                    ) : null}
                    <div className="flex-1">
                      <p className="font-medium">
                        {role.title || '—'}{' '}
                        {role.companyName ? (
                          role.companyURL ? (
                            <a
                              className="text-muted-foreground hover:text-foreground underline underline-offset-4"
                              href={role.companyURL}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              @ {role.companyName}
                            </a>
                          ) : (
                            `@ ${role.companyName}`
                          )
                        ) : (
                          ''
                        )}
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {[
                          formatDatePart(role.start),
                          '–',
                          formatDatePart(role.end) ?? 'Present',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      </p>
                      <div className="text-muted-foreground mt-1 text-xs">
                        {[
                          role.location,
                          role.employmentType,
                          role.locationType,
                          role.companyIndustry,
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </div>
                      {role.description ? (
                        <p className="mt-2 text-sm">{role.description}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {skills.length ? (
          <>
            <Separator />
            <section>
              <h3 className="mb-2 text-sm font-medium text-foreground">
                Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((name, i) => (
                  <Badge key={i} variant="outline">
                    {name}
                  </Badge>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {educations.length ? (
          <>
            <Separator />
            <section>
              <h3 className="mb-2 text-sm font-medium text-foreground">
                Education
              </h3>
              <div className="space-y-2.5">
                {educations.map((edu, idx) => (
                  <div key={idx} className="rounded-md border p-3.5">
                    <div className="flex items-start gap-3">
                      {(() => {
                        const schoolLogo =
                          (edu.logo || [])?.find?.((l) => !!l?.url)?.url;
                        return schoolLogo ? (
                          <Avatar className="size-9">
                            <AvatarImage
                              src={schoolLogo}
                              alt={edu.schoolName ?? 'School logo'}
                            />
                            <AvatarFallback>
                              {initialsOf(edu.schoolName ?? 'School')}
                            </AvatarFallback>
                          </Avatar>
                        ) : edu.schoolName ? (
                          <div className="size-9 shrink-0 rounded-md bg-muted text-xs font-medium flex items-center justify-center">
                            {initialsOf(edu.schoolName)}
                          </div>
                        ) : null;
                      })()}
                      <div className="flex-1">
                        <p className="font-medium">
                          {edu.schoolName || '—'}
                          {edu.degree ? (
                            <span className="text-muted-foreground">
                              {' '}
                              • {edu.degree}
                            </span>
                          ) : null}
                          {edu.fieldOfStudy ? (
                            <span className="text-muted-foreground">
                              , {edu.fieldOfStudy}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {[
                            formatDatePart(edu.start),
                            '–',
                            formatDatePart(edu.end) ?? undefined,
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        </p>
                        {edu.grade ? (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Grade: {edu.grade}
                          </p>
                        ) : null}
                        {edu.activities ? (
                          <p className="mt-2 text-sm">{edu.activities}</p>
                        ) : null}
                        {edu.description ? (
                          <p className="text-muted-foreground mt-1 text-sm">
                            {edu.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {languages.length ? (
          <>
            <Separator />
            <section>
              <h3 className="mb-2 text-sm font-medium text-foreground">
                Languages
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Proficiency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {languages.map((lang, i) => (
                    <TableRow key={i}>
                      <TableCell>{lang.name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {lang.proficiency || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          </>
        ) : null}

        <Accordion
          type="multiple"
          className="rounded-md border"
          defaultValue={['meta']}
        >
          <AccordionItem value="certs">
            <AccordionTrigger>Certifications</AccordionTrigger>
            <AccordionContent>
              {Array.isArray(profile.certifications) &&
              profile.certifications.length ? (
                <div className="space-y-2.5">
                  {profile.certifications.map((c, i) => {
                    const name = c.name ?? c.title ?? 'Certification';
                    const issuer = c.issuer;
                    const date =
                      c.date ??
                      c.issued ??
                      (typeof c.year === 'number' ? String(c.year) : c.year);
                    return (
                      <div key={i} className="rounded-md border p-3.5">
                        <p className="font-medium">{name}</p>
                        {issuer ? (
                          <p className="text-muted-foreground mt-1 text-sm">
                            Issuer: {issuer}
                          </p>
                        ) : null}
                        {date ? (
                          <p className="text-muted-foreground mt-1 text-xs">
                            {date}
                          </p>
                        ) : null}
                        <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 text-xs">
                          {JSON.stringify(c, null, 2)}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              ) : profile.certifications ? (
                <pre className="bg-muted overflow-x-auto rounded p-2 text-xs">
                  {JSON.stringify(profile.certifications, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No certifications
                </p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="projects">
            <AccordionTrigger>Projects</AccordionTrigger>
            <AccordionContent>
              {projectItems.length ? (
                <div className="space-y-2.5">
                  {projectItems.map((p: any, i: number) => {
                    const name = p.name ?? p.title ?? 'Project';
                    const description = p.description;
                    const url = p.url as string | undefined;
                    const contributors: any[] = Array.isArray(p.contributors)
                      ? p.contributors
                      : [];
                    return (
                      <div key={i} className="rounded-md border p-3.5">
                        <p className="font-medium">
                          {name}{' '}
                          {url ? (
                            <a
                              className="text-muted-foreground hover:text-foreground underline underline-offset-4"
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              (link)
                            </a>
                          ) : null}
                        </p>
                        {description ? (
                          <p className="text-muted-foreground mt-1 text-sm">
                            {description}
                          </p>
                        ) : null}
                        {contributors.length ? (
                          <div className="mt-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Contributors
                            </p>
                            <div className="mt-1 flex -space-x-2">
                              {contributors.slice(0, 8).map((c, ci) => {
                                const pictures = Array.isArray(
                                  c.profilePicture
                                )
                                  ? (c.profilePicture as any[])
                                  : [];
                                const picUrl =
                                  pictures.find((pp) => !!pp?.url)?.url;
                                const displayName =
                                  c.fullName ||
                                  [c.firstName, c.lastName]
                                    .filter(Boolean)
                                    .join(' ') ||
                                  c.username ||
                                  'User';
                                return (
                                  <Avatar
                                    key={ci}
                                    className="size-7 ring-2 ring-background"
                                    title={displayName}
                                  >
                                    {picUrl ? (
                                      <AvatarImage
                                        src={picUrl}
                                        alt={displayName}
                                      />
                                    ) : null}
                                    <AvatarFallback>
                                      {initialsOf(displayName)}
                                    </AvatarFallback>
                                  </Avatar>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (profile as any).projects ? (
                <p className="text-muted-foreground text-sm">
                  Projects are present but could not be parsed.
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">No projects</p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="i18n">
            <AccordionTrigger>Internationalization</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Supported locales
                  </p>
                  {Array.isArray(profile.supportedLocales) &&
                  profile.supportedLocales.length ? (
                    <ul className="mt-1 list-inside list-disc text-sm">
                      {profile.supportedLocales.map((loc, i) => (
                        <li key={i}>
                          {typeof loc === 'string' ? loc : JSON.stringify(loc)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">—</p>
                  )}
                </div>
                <div className="sm:col-span-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Multi-locale fields
                  </p>
                  <div className="mt-1 space-y-2 text-sm">
                    {profile.multiLocaleFirstName ? (
                      <div>
                        <p className="text-muted-foreground text-xs">
                          First name
                        </p>
                        <pre className="bg-muted overflow-x-auto rounded p-2 text-xs">
                          {JSON.stringify(
                            profile.multiLocaleFirstName,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    ) : null}
                    {profile.multiLocaleLastName ? (
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Last name
                        </p>
                        <pre className="bg-muted overflow-x-auto rounded p-2 text-xs">
                          {JSON.stringify(profile.multiLocaleLastName, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                    {profile.multiLocaleHeadline ? (
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Headline
                        </p>
                        <pre className="bg-muted overflow-x-auto rounded p-2 text-xs">
                          {JSON.stringify(profile.multiLocaleHeadline, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="meta">
            <AccordionTrigger>Profile metadata</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="rounded-md border p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    ID
                  </p>
                  <p className="text-sm">{profile.id ?? '—'}</p>
                </div>
                <div className="rounded-md border p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    URN
                  </p>
                  <p className="text-sm break-all">{profile.urn ?? '—'}</p>
                </div>
                <div className="rounded-md border p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Username
                  </p>
                  <p className="text-sm">{profile.username}</p>
                </div>
                <div className="rounded-md border p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Geo
                  </p>
                  <p className="text-sm">
                    {profile.geo?.full ||
                      [profile.geo?.city, profile.geo?.country]
                        .filter(Boolean)
                        .join(', ') ||
                      '—'}
                  </p>
                  {profile.geo?.countryCode ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Code: {profile.geo?.countryCode}
                    </p>
                  ) : null}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
          </>
        )}
      </CardContent>
    </Card>
  );
}
