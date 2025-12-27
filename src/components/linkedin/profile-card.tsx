'use client';

import { ExternalLink } from 'lucide-react';
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
import { Card } from '~/components/ui/card';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { LINKEDIN_RESCRAPE_THRESHOLD_MONTHS } from '~/lib/constants';
import {
  calculateDuration,
  formatDatePart,
  formatProficiency,
  formatRelativeTime,
  initialsOf,
  isOlderThanThreshold,
} from '~/lib/linkedin/formatters';
import type {
  LinkedInProject,
  LinkedInRawProfile,
} from '~/lib/linkedin/schema';

export function ProfileCard({
  profile,
  lastAnalysedAt,
  onRescrape,
  isRescraping = false,
}: {
  profile: LinkedInRawProfile;
  lastAnalysedAt?: string | null;
  onRescrape?: () => void;
  isRescraping?: boolean;
}) {
  const [showRawJson, setShowRawJson] = React.useState(false);

  const fullName = React.useMemo(
    () =>
      [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim(),
    [profile.firstName, profile.lastName]
  );
  const username = profile.username ?? '';
  const title = React.useMemo(
    () => (fullName || username || 'LinkedIn User').trim(),
    [fullName, username]
  );
  const location = React.useMemo(
    () =>
      profile.geo?.full ||
      [profile.geo?.city, profile.geo?.country].filter(Boolean).join(', ') ||
      undefined,
    [profile.geo]
  );
  const avatarUrl = React.useMemo(
    () =>
      profile.profilePicture || profile.profilePictures?.[0]?.url || undefined,
    [profile.profilePicture, profile.profilePictures]
  );
  const linkedinUrl = React.useMemo(
    () => (username ? `https://www.linkedin.com/in/${username}` : undefined),
    [username]
  );

  const positions = React.useMemo(() => {
    const pos = (profile.fullPositions ?? profile.position ?? []).slice();
    const yearVal = (y?: number | null) =>
      typeof y === 'number' && y > 0 ? y : undefined;
    pos.sort((a, b) => {
      const aEnd = yearVal(a.end?.year) ?? 9999;
      const bEnd = yearVal(b.end?.year) ?? 9999;
      if (aEnd !== bEnd) return bEnd - aEnd;
      const aStart = yearVal(a.start?.year) ?? 0;
      const bStart = yearVal(b.start?.year) ?? 0;
      return bStart - aStart;
    });
    return pos;
  }, [profile.fullPositions, profile.position]);

  const allExperience = positions;

  const skills = React.useMemo(
    () => (profile.skills ?? []).filter((s) => s?.name?.trim()),
    [profile.skills]
  );

  const educations = profile.educations ?? [];
  const languages = profile.languages ?? [];

  const projectItems: LinkedInProject[] = React.useMemo(() => {
    return Array.isArray(profile.projects)
      ? (profile.projects as LinkedInProject[])
      : Array.isArray(profile.projects?.items)
      ? (profile.projects.items as LinkedInProject[])
      : [];
  }, [profile.projects]);

  if (showRawJson) {
    return (
      <Card className="w-full">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Raw JSON Data</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRawJson(false)}
            >
              View Profile
            </Button>
          </div>
          <ScrollArea className="h-[600px] w-full">
            <pre className="bg-muted rounded-lg p-4 text-xs whitespace-pre-wrap wrap-break-word overflow-wrap-anywhere">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </ScrollArea>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Hero Section */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-b from-muted/50 to-background px-6 pb-8 pt-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar className="size-32 border-4 border-background shadow-lg sm:size-36">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={title} />
              ) : (
                <AvatarFallback className="text-2xl">
                  {initialsOf(title)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                      {title}
                    </h1>
                    {profile.headline && (
                      <p className="mt-1 text-lg text-muted-foreground">
                        {profile.headline}
                      </p>
                    )}
                  </div>
                  {location && (
                    <p className="text-muted-foreground">{location}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {profile.isPremium && (
                      <Badge variant="default">Premium</Badge>
                    )}
                    {profile.isOpenToWork && (
                      <Badge variant="secondary">Open to work</Badge>
                    )}
                    {profile.isHiring && (
                      <Badge variant="outline">Hiring</Badge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {linkedinUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="gap-2"
                    >
                      <a
                        href={linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center"
                      >
                        <ExternalLink className="size-4" />
                        View on LinkedIn
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRawJson(true)}
                    className="text-xs"
                  >
                    View JSON
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {lastAnalysedAt && (
                  <span>
                    Last analysed: {formatRelativeTime(lastAnalysedAt)}
                  </span>
                )}
                {lastAnalysedAt &&
                  isOlderThanThreshold(
                    lastAnalysedAt,
                    LINKEDIN_RESCRAPE_THRESHOLD_MONTHS
                  ) &&
                  onRescrape && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={onRescrape}
                      disabled={isRescraping}
                      className="h-auto p-0 text-sm"
                    >
                      {isRescraping ? 'Re-scraping…' : 'Re-scrape profile'}
                    </Button>
                  )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* About Section */}
      {profile.summary && (
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-xl font-semibold">About</h2>
            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
              {profile.summary}
            </p>
          </div>
        </Card>
      )}

      {/* Experience Section */}
      {allExperience.length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Experience</h2>
            <div className="space-y-6">
              {allExperience.map((role, idx) => {
                const roleKey = `${role.companyName || 'unknown'}-${
                  role.title || 'untitled'
                }-${role.start?.year || 'unknown-start'}-${
                  role.end?.year || 'current'
                }-${idx}`;
                return (
                  <div key={roleKey} className="flex gap-4">
                    {idx < allExperience.length - 1 && (
                      <div className="flex flex-col items-center">
                        <div className="size-12 shrink-0 rounded-full border-2 border-border bg-background" />
                        <div className="mt-2 h-full w-px bg-border" />
                      </div>
                    )}
                    {role.companyLogo ? (
                      <Avatar className="size-12 shrink-0">
                        <AvatarImage
                          src={role.companyLogo}
                          alt={role.companyName ?? 'Company logo'}
                        />
                        <AvatarFallback>
                          {initialsOf(role.companyName ?? 'Company')}
                        </AvatarFallback>
                      </Avatar>
                    ) : role.companyName ? (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium">
                        {initialsOf(role.companyName)}
                      </div>
                    ) : (
                      <div className="size-12 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="text-lg font-semibold">
                          {role.title || '—'}
                        </p>
                        {role.companyName && (
                          <p className="text-muted-foreground">
                            {role.companyURL ? (
                              <a
                                className="hover:text-foreground underline underline-offset-4"
                                href={role.companyURL}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {role.companyName}
                              </a>
                            ) : (
                              role.companyName
                            )}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[
                          formatDatePart(role.start),
                          '–',
                          formatDatePart(role.end) ?? 'Present',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        {(() => {
                          const duration = calculateDuration(
                            role.start,
                            role.end
                          );
                          return duration ? (
                            <span className="ml-1">· {duration}</span>
                          ) : null;
                        })()}
                      </p>
                      {[role.location, role.employmentType, role.locationType]
                        .filter(Boolean)
                        .join(' • ') && (
                        <p className="text-xs text-muted-foreground/70">
                          {[
                            role.location,
                            role.employmentType,
                            role.locationType,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      )}
                      {role.description && (
                        <p className="text-muted-foreground mt-2 whitespace-pre-line text-sm">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Education Section */}
      {educations.length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Education</h2>
            <div className="space-y-6">
              {educations.map((edu, idx) => {
                const eduKey = `${edu.schoolName || 'unknown'}-${
                  edu.degree || 'no-degree'
                }-${edu.start?.year || 'no-start'}-${
                  edu.end?.year || 'ongoing'
                }-${idx}`;
                const schoolLogo = (edu.logo || [])?.find?.(
                  (l) => !!l?.url
                )?.url;
                return (
                  <div key={eduKey} className="flex gap-4">
                    {schoolLogo ? (
                      <Avatar className="size-12 shrink-0">
                        <AvatarImage
                          src={schoolLogo}
                          alt={edu.schoolName ?? 'School logo'}
                        />
                        <AvatarFallback>
                          {initialsOf(edu.schoolName ?? 'School')}
                        </AvatarFallback>
                      </Avatar>
                    ) : edu.schoolName ? (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium">
                        {initialsOf(edu.schoolName)}
                      </div>
                    ) : (
                      <div className="size-12 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-lg font-semibold">
                        {edu.schoolName || '—'}
                      </p>
                      {(edu.degree || edu.fieldOfStudy) && (
                        <p className="text-muted-foreground">
                          {[edu.degree, edu.fieldOfStudy]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      {[formatDatePart(edu.start), formatDatePart(edu.end)]
                        .filter(Boolean)
                        .join(' – ') && (
                        <p className="text-sm text-muted-foreground">
                          {[formatDatePart(edu.start), formatDatePart(edu.end)]
                            .filter(Boolean)
                            .join(' – ')}
                        </p>
                      )}
                      {edu.grade && (
                        <p className="text-xs text-muted-foreground/70">
                          Grade: {edu.grade}
                        </p>
                      )}
                      {edu.description && (
                        <p className="text-muted-foreground mt-2 text-sm">
                          {edu.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Skills Section */}
      {skills.length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-xl font-semibold">
              Skills{' '}
              {skills.length > 0 && (
                <span className="text-muted-foreground font-normal">
                  ({skills.length})
                </span>
              )}
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <Badge
                  key={skill.name || `skill-${i}`}
                  variant={skill.passedSkillAssessment ? 'default' : 'outline'}
                  className="gap-1.5 py-1.5"
                >
                  {skill.name}
                  {skill.endorsementsCount && skill.endorsementsCount > 0 ? (
                    <span className="bg-background/20 rounded px-1.5 py-0.5 text-[10px] font-semibold">
                      {skill.endorsementsCount}
                    </span>
                  ) : null}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Languages Section */}
      {languages.length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Languages</h2>
            <div className="flex flex-wrap gap-3">
              {languages.map((lang, i) => (
                <div
                  key={lang.name || `lang-${i}`}
                  className="flex items-center gap-2 rounded-md border bg-card px-4 py-2"
                >
                  <span className="font-medium">{lang.name || '—'}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-muted-foreground text-sm">
                    {formatProficiency(lang.proficiency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Profile Media */}
      {profile.profilePictures && profile.profilePictures.length > 1 && (
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Profile media</h2>
            <ScrollArea className="w-full">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {profile.profilePictures
                  .filter((img) => !!img?.url)
                  .map((img, idx) => (
                    <img
                      key={idx}
                      src={img.url}
                      alt={`profile-image-${idx + 1}`}
                      className="h-24 w-24 shrink-0 rounded-lg object-cover"
                      width={img.width ?? 96}
                      height={img.height ?? 96}
                    />
                  ))}
              </div>
            </ScrollArea>
          </div>
        </Card>
      )}

      {/* Additional Sections (Accordion) */}
      <Card>
        <div className="p-6">
          <Accordion type="multiple" className="w-full">
            {projectItems.length > 0 && (
              <AccordionItem value="projects">
                <AccordionTrigger className="text-lg font-semibold">
                  Projects ({projectItems.length})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {projectItems.map((p, i) => {
                      const name = p.name ?? p.title ?? 'Project';
                      const description = p.description;
                      const url = p.url;
                      const contributors: unknown[] = Array.isArray(
                        (p as Record<string, unknown>).contributors
                      )
                        ? ((p as Record<string, unknown>)
                            .contributors as unknown[])
                        : [];
                      const projectKey = `${name}-${url || i}`;
                      return (
                        <div key={projectKey} className="rounded-md border p-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold">{name}</p>
                            {url && (
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="gap-1"
                                >
                                  <ExternalLink className="size-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                          {description && (
                            <p className="text-muted-foreground mt-2 text-sm">
                              {description}
                            </p>
                          )}
                          {contributors.length > 0 && (
                            <div className="mt-3">
                              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                                Contributors
                              </p>
                              <div className="flex -space-x-2">
                                {contributors.slice(0, 8).map((c, ci) => {
                                  const contributor = c as Record<
                                    string,
                                    unknown
                                  >;
                                  const pictures = Array.isArray(
                                    contributor.profilePicture
                                  )
                                    ? (contributor.profilePicture as Array<{
                                        url?: string;
                                      }>)
                                    : [];
                                  const picUrl = pictures.find(
                                    (pp) => !!pp?.url
                                  )?.url;
                                  const displayName =
                                    (typeof contributor.fullName === 'string'
                                      ? contributor.fullName
                                      : undefined) ||
                                    [
                                      typeof contributor.firstName === 'string'
                                        ? contributor.firstName
                                        : undefined,
                                      typeof contributor.lastName === 'string'
                                        ? contributor.lastName
                                        : undefined,
                                    ]
                                      .filter(Boolean)
                                      .join(' ') ||
                                    (typeof contributor.username === 'string'
                                      ? contributor.username
                                      : undefined) ||
                                    'User';
                                  const contributorKey = `${displayName}-${ci}`;
                                  return (
                                    <Avatar
                                      key={contributorKey}
                                      className="size-8 ring-2 ring-background"
                                      title={displayName}
                                    >
                                      {picUrl ? (
                                        <AvatarImage
                                          src={picUrl}
                                          alt={displayName}
                                        />
                                      ) : null}
                                      <AvatarFallback className="text-xs">
                                        {initialsOf(displayName)}
                                      </AvatarFallback>
                                    </Avatar>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {Array.isArray(profile.certifications) &&
              profile.certifications.length > 0 && (
                <AccordionItem value="certs">
                  <AccordionTrigger className="text-lg font-semibold">
                    Certifications ({profile.certifications.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {profile.certifications.map((c, i) => {
                        const name = c.name ?? c.title ?? 'Certification';
                        const issuer = c.issuer;
                        const date =
                          c.date ??
                          c.issued ??
                          (typeof c.year === 'number'
                            ? String(c.year)
                            : c.year);
                        const certKey = `${name}-${issuer || 'unknown'}-${
                          date || i
                        }`;
                        return (
                          <div key={certKey} className="rounded-md border p-4">
                            <p className="font-semibold">{name}</p>
                            {issuer && (
                              <p className="text-muted-foreground mt-1 text-sm">
                                Issued by {issuer}
                              </p>
                            )}
                            {date && (
                              <p className="text-muted-foreground mt-1 text-xs">
                                {date}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

            <AccordionItem value="meta">
              <AccordionTrigger className="text-lg font-semibold">
                Profile metadata
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                      ID
                    </p>
                    <p className="text-sm">{profile.id ?? '—'}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                      Username
                    </p>
                    <p className="text-sm">{profile.username}</p>
                  </div>
                  {profile.geo && (
                    <div className="rounded-md border p-3">
                      <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                        Location
                      </p>
                      <p className="text-sm">
                        {profile.geo.full ||
                          [profile.geo.city, profile.geo.country]
                            .filter(Boolean)
                            .join(', ') ||
                          '—'}
                      </p>
                      {profile.geo.countryCode && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Code: {profile.geo.countryCode}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </Card>
    </div>
  );
}
