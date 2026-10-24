import { Component, OnInit, signal } from "@angular/core";
import { DatePipe, NgTemplateOutlet } from "@angular/common";
import { ApiService, BadgeItem, BadgesOverview } from "../../../core/api.service.js";

type Tab = "upcoming" | "sent" | "all";

const SENT_KIND_LABELS: Record<string, string> = {
  weekly: "Weekly digest",
  today: "Today only",
  tomorrow: "Tomorrow only",
};

@Component({
  selector: "app-badges",
  standalone: true,
  imports: [DatePipe, NgTemplateOutlet],
  templateUrl: "./badges.component.html",
})
export class BadgesComponent implements OnInit {
  readonly tab = signal<Tab>("upcoming");
  readonly overview = signal<BadgesOverview | null>(null);
  readonly loading = signal(false);
  readonly error = signal("");
  readonly togglingId = signal<number | null>(null);

  constructor(private readonly api: ApiService) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      this.overview.set(await this.api.getBadges());
    } catch {
      this.error.set("Failed to load badges.");
    } finally {
      this.loading.set(false);
    }
  }

  stars(difficulty: number): string {
    return "⭐".repeat(Math.max(1, Math.min(3, difficulty)));
  }

  sentKindLabel(kind: string): string {
    return SENT_KIND_LABELS[kind] ?? kind;
  }

  async toggleIgnore(badge: BadgeItem) {
    const ignored = !badge.ignored;
    this.togglingId.set(badge.id);
    try {
      await this.api.setBadgeIgnored(badge.id, ignored);
      // The same badge can appear in several lists, so update every copy
      const mark = <T extends BadgeItem>(list: T[]): T[] =>
        list.map((b) => (b.id === badge.id ? { ...b, ignored } : b));
      this.overview.update((o) => {
        if (!o) {
          return o;
        }
        return {
          upcoming: {
            ...o.upcoming,
            weekly: mark(o.upcoming.weekly),
            today: mark(o.upcoming.today),
            tomorrow: mark(o.upcoming.tomorrow),
          },
          recentlySent: mark(o.recentlySent),
          all: mark(o.all),
        };
      });
    } catch {
      this.error.set("Failed to update the ignore list.");
    } finally {
      this.togglingId.set(null);
    }
  }
}
