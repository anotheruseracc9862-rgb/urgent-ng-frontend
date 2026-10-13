"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Field,
  FormError,
  FormField,
  FormHint,
  Input,
  InputGroup,
  InputGroupAddon,
  KeyValue,
  KeyValueItem,
  KeyValueTerm,
  KeyValueValue,
  ListRow,
  ListRowAction,
  ListRowContent,
  ListRowDescription,
  ListRowTitle,
  LoadingState,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Stat,
  Steps,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@urgent/ui";
import {
  AlertCircle,
  Bell,
  Check,
  Clock3,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";

const badgeVariants = ["default", "green", "lime", "blue", "amber", "red", "violet", "dark"] as const;
const buttonVariants = ["primary", "dark", "ghost", "soft", "danger"] as const;
const cardVariants = ["default", "flat", "tint", "dark"] as const;

export function PrimitiveGallery() {
  const [currentPage, setCurrentPage] = useState(2);
  const [retried, setRetried] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <TooltipProvider delayDuration={0}>
      <main className="min-h-screen bg-bg px-4 py-8 text-ink sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-8">
          <header>
            <p className="text-xs font-extrabold uppercase tracking-[.12em] text-green">
              Demo business UI reference
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em]">
              Component gallery
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Shared primitives styled against the business interface in
              demo/ui.css and demo/BUSINESS-UI.md.
            </p>
          </header>

          <GallerySection title="Buttons and badges" description="Pill actions and status badges use the demo's palette and icon-plus-label treatment.">
            <div className="flex flex-wrap gap-3">
              {buttonVariants.map((variant) => (
                <Button key={variant} variant={variant}>{variant}</Button>
              ))}
              <Button size="sm" variant="ghost">Small</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
              <Button isLoading>Saving</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {badgeVariants.map((variant) => (
                <Badge key={variant} variant={variant}>{variant}</Badge>
              ))}
              <Badge variant="green" icon={<Check className="size-3.5" />}>Verified</Badge>
            </div>
          </GallerySection>

          <GallerySection title="Cards, stats and alerts" description="White 22px cards, compact stats, and semantic alerts mirror the demo's data surfaces.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cardVariants.map((variant) => (
                <Card key={variant} variant={variant}>
                  <CardHeader>
                    <div>
                      <CardTitle>{variant === "default" ? "Card" : `${variant} card`}</CardTitle>
                      <CardDescription>Reusable surface</CardDescription>
                    </div>
                    <Package aria-hidden="true" className="size-5 text-green" />
                  </CardHeader>
                  <CardContent className="text-sm">Content follows the selected card treatment.</CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label="Completed errands" value="128" delta={{ value: "+12%", trend: "up" }} icon={<Check className="size-5 text-green" />} />
              <Stat label="Open offers" value="4" delta={{ value: "-2%", trend: "down" }} icon={<Clock3 className="size-5 text-amber" />} />
            </div>
            <div className="grid gap-3">
              <Alert variant="info">Helpful context appears beside the information icon.</Alert>
              <Alert variant="default">A neutral alert provides guidance without a status colour.</Alert>
              <Alert variant="warn">A warning keeps its label and icon as well as its colour.</Alert>
              <Alert variant="danger">Danger actions and errors remain explicit.</Alert>
              <Alert variant="ok">This action completed successfully.</Alert>
              <Alert variant="lime">A brand-tinted informational message.</Alert>
            </div>
          </GallerySection>

          <GallerySection title="Fields and form controls" description="Labels, hints, errors, input groups and selects match the demo's 48px controls.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="gallery-email" label="Email address" hint="We will only use this for errand updates." required>
                <Input type="email" placeholder="you@example.com" />
              </Field>
              <div className="grid gap-[7px]">
                <label htmlFor="gallery-search" className="text-[12.5px] font-bold text-ink-2">Search errands</label>
                <InputGroup>
                  <InputGroupAddon><Search aria-hidden="true" className="size-4" /></InputGroupAddon>
                  <Input id="gallery-search" aria-label="Search errands" placeholder="Search by title" />
                </InputGroup>
              </div>
              <FormField>
                <label htmlFor="gallery-error" className="text-[12.5px] font-bold text-ink-2">Pickup details</label>
                <Input id="gallery-error" error defaultValue="" aria-describedby="gallery-form-error" />
                <FormError id="gallery-form-error">Enter a valid pickup description.</FormError>
                <FormHint>Provide a nearby landmark if you can.</FormHint>
              </FormField>
              <div className="grid gap-[7px]">
                <label htmlFor="gallery-hint" className="text-[12.5px] font-bold text-ink-2">Extra instructions</label>
                <Textarea id="gallery-hint" placeholder="Add useful details" />
                <FormHint>Do not include passwords or one-time codes.</FormHint>
              </div>
              <Field id="gallery-category" label="Category">
                <Select defaultValue="shopping">
                  <SelectTrigger id="gallery-category" aria-label="Category">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex min-h-12 items-center gap-3">
                <Switch aria-label="Enable notifications" defaultChecked />
                <span className="text-sm font-semibold">Enable notifications</span>
              </div>
            </div>
          </GallerySection>

          <GallerySection title="Tabs and overlays" description="Radix keyboard and focus behaviour is retained under the demo-inspired segmented controls.">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList aria-label="Errand views">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="offers">Offers</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)]">
                Overview content is shown.
              </TabsContent>
              <TabsContent value="offers" className="rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)]">
                Offers content is shown.
              </TabsContent>
              <TabsContent value="history" className="rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)]">
                History content is shown.
              </TabsContent>
            </Tabs>
            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild><Button variant="ghost">Open dialog</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm action</DialogTitle>
                    <DialogDescription>Dialog focus is contained until you close this panel.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter><Button variant="dark">Continue</Button></DialogFooter>
                </DialogContent>
              </Dialog>
              <Drawer>
                <DrawerTrigger asChild><Button variant="soft">Open drawer</Button></DrawerTrigger>
                <DrawerContent side="right">
                  <DrawerHeader>
                    <DrawerTitle>Errand details</DrawerTitle>
                    <DrawerDescription>Responsive side panel with modal keyboard behaviour.</DrawerDescription>
                  </DrawerHeader>
                  <p className="text-sm text-muted">Drawer content can contain details, filters or actions.</p>
                  <DrawerFooter><Button variant="ghost">Done</Button></DrawerFooter>
                </DrawerContent>
              </Drawer>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost">More actions</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Errand actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => toast.success("Errand copied")}>Copy errand</DropdownMenuItem>
                  <DropdownMenuItem disabled>Unavailable action</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="soft" aria-label="Safety information"><ShieldCheck aria-hidden="true" /> Safety</Button></TooltipTrigger>
                <TooltipContent>Keep payments between the requester and runner.</TooltipContent>
              </Tooltip>
            </div>
          </GallerySection>

          <GallerySection title="Data display" description="Semantic rows, definition lists and scrollable tables follow the demo's compact workspace patterns.">
            <Card>
              <ListRow>
                <Avatar initials="EA" size="lg" />
                <ListRowContent>
                  <ListRowTitle>Errand accepted</ListRowTitle>
                  <ListRowDescription>Collect a parcel from Ikeja</ListRowDescription>
                </ListRowContent>
                <ListRowAction><Badge variant="green">Assigned</Badge></ListRowAction>
              </ListRow>
              <ListRow asChild>
                <a href="#gallery-list-row">
                  <Avatar initials="MK" variant="blue" />
                  <ListRowContent>
                    <ListRowTitle>Clickable list row</ListRowTitle>
                    <ListRowDescription>Keyboard-focusable link surface</ListRowDescription>
                  </ListRowContent>
                  <MapPin aria-hidden="true" className="size-4 text-muted" />
                </a>
              </ListRow>
            </Card>
            <Card>
              <KeyValue>
                <KeyValueItem><KeyValueTerm>Pickup area</KeyValueTerm><KeyValueValue>Ikeja</KeyValueValue></KeyValueItem>
                <KeyValueItem><KeyValueTerm>Runner rating</KeyValueTerm><KeyValueValue><Star aria-hidden="true" className="mr-1 inline size-3.5 text-amber" />4.9</KeyValueValue></KeyValueItem>
                <KeyValueItem><KeyValueTerm>Status</KeyValueTerm><KeyValueValue><Badge variant="lime">In progress</Badge></KeyValueValue></KeyValueItem>
              </KeyValue>
            </Card>
            <Card className="p-3 sm:p-5">
              <Table>
                <TableHeader><TableRow><TableHead scope="col">Errand</TableHead><TableHead scope="col">Area</TableHead><TableHead scope="col">Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow><TableCell className="font-semibold">Collect documents</TableCell><TableCell>Yaba</TableCell><TableCell><Badge variant="green">Completed</Badge></TableCell></TableRow>
                  <TableRow><TableCell className="font-semibold">Pick up groceries</TableCell><TableCell>Lekki</TableCell><TableCell><Badge variant="amber">Awaiting runner</Badge></TableCell></TableRow>
                </TableBody>
              </Table>
            </Card>
          </GallerySection>

          <GallerySection title="Progress, states and pagination" description="Empty, error, loading and progress states include text labels and next actions.">
            <Steps
              currentStep={2}
              items={[
                { label: "Posted", description: "Request is live" },
                { label: "Runner selected", description: "Offer accepted" },
                { label: "In progress", description: "Runner is on the way" },
                { label: "Completed", description: "Confirm delivery" },
              ]}
            />
            <div className="grid gap-3 lg:grid-cols-3">
              <Card><EmptyState icon={<Package aria-hidden="true" />} title="No errands yet" description="Post your first errand to get offers from nearby runners." action={<Button>Post an errand</Button>} /></Card>
              <ErrorState
                title={retried ? "Retry requested" : undefined}
                message="We could not load your errands. Check your connection and try again."
                requestId="demo-request-123"
                onRetry={() => setRetried(true)}
              />
              <LoadingState label="Loading errands" />
            </div>
            <div className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)]">
              <p className="text-sm font-bold">Skeleton preview</p>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-28 rounded-full" />
            </div>
            <Pagination aria-label="Errand pages">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    aria-label="Go to previous page"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                <PaginationItem>
                  <Button variant="dark" size="sm" aria-current="page">{currentPage}</Button>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext onClick={() => setCurrentPage((page) => page + 1)} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </GallerySection>

          <GallerySection title="Toast integration" description="The application-level Sonner toaster is already mounted by the web root layout.">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => toast.success("Your changes have been saved.")}>Show success toast</Button>
              <Button variant="danger" onClick={() => toast.error("We could not complete that action.")}>
                <AlertCircle aria-hidden="true" /> Show error toast
              </Button>
              <Button variant="ghost" onClick={() => toast("New errand activity", { icon: <Bell aria-hidden="true" /> })}>
                Show activity toast
              </Button>
            </div>
          </GallerySection>
        </div>
      </main>
    </TooltipProvider>
  );
}

function GallerySection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="grid gap-4 rounded-[var(--r-xl)] bg-surface p-4 shadow-[var(--shadow)] sm:p-6">
      <header>
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </header>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
