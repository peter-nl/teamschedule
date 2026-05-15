import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="docs-page">

        <!-- Sidebar -->
        <nav class="docs-sidebar">
          <p class="sidebar-heading">Contents</p>
          <a class="sidebar-link" (click)="scrollTo('getting-started')">Getting started</a>
          <a class="sidebar-link" (click)="scrollTo('schedule')">The schedule</a>
          <a class="sidebar-link" (click)="scrollTo('days-off')">My days off</a>
          <a class="sidebar-link" (click)="scrollTo('account')">My account</a>
          <a class="sidebar-link" (click)="scrollTo('team-leaders')">For team leaders</a>
          <a class="sidebar-link" (click)="scrollTo('org-admins')">For organisation admins</a>
          <a class="sidebar-link sysadmin-link" *ngIf="authService.isSysadmin" (click)="scrollTo('sysadmin')">For system administrators</a>
        </nav>

        <!-- Content -->
        <div class="docs-content">

          <h1 class="docs-title">TeamSchedule documentation</h1>

          <!-- ── Getting started ─────────────────────────── -->
          <section id="getting-started">
            <h2><mat-icon>login</mat-icon> Getting started</h2>
            <h3>Logging in</h3>
            <p>Open the app and enter your <strong>email address</strong> and <strong>password</strong> on the home page. If you have access to more than one organisation you will be asked to choose one before continuing.</p>
            <div class="tip">
              <mat-icon>info</mat-icon>
              <span>If you have forgotten your password, click <strong>Forgot password?</strong> below the sign-in form and enter your email address. You will receive a reset link by email.</span>
            </div>

            <h3>Navigating the app</h3>
            <p>The navigation rail on the left side gives access to the main areas:</p>
            <ul>
              <li><strong>Schedule</strong> — the team leave matrix</li>
              <li><strong>Management</strong> — teams, members and organisation settings (visible to admins)</li>
              <li><strong>Account</strong> — your profile and password</li>
            </ul>

            <h3>Switching language</h3>
            <p>Click the account icon at the top of the navigation rail. A menu appears where you can switch between English (EN) and Dutch (NL). The preference is saved in your browser.</p>
          </section>

          <!-- ── The schedule ────────────────────────────── -->
          <section id="schedule">
            <h2><mat-icon>calendar_month</mat-icon> The schedule</h2>
            <h3>What you see</h3>
            <p>The schedule is a matrix: <strong>rows</strong> are team members, <strong>columns</strong> are dates. Each cell shows whether that person is working, on leave, or has another status on that day.</p>

            <h3>Colour guide</h3>
            <ul>
              <li><strong>Light grey / dark grey cells</strong> — non-working days (weekends or days not configured as working days)</li>
              <li><strong>Pink / red cells</strong> — public holidays</li>
              <li><strong>Medium grey cells</strong> — scheduled days off (roostervrij)</li>
              <li><strong>Coloured cells</strong> — personal leave entries, colour depends on the leave type</li>
            </ul>

            <h3>Controls</h3>
            <ul>
              <li><strong>Filter by team</strong> — click the filter icon in the toolbar to show only members of selected teams. The AND/OR toggle lets you combine multiple teams.</li>
              <li><strong>Search</strong> — click the search icon and type a name to jump to that person's row.</li>
              <li><strong>Zoom</strong> — use the + / − buttons to make date columns wider or narrower.</li>
              <li><strong>Today</strong> — click <em>Go to today</em> to scroll the date axis back to the current date.</li>
              <li><strong>My row</strong> — click <em>Go to my row</em> to scroll vertically to your own row.</li>
            </ul>

            <h3>Adding a day off from the schedule</h3>
            <p>Click any cell in <strong>your own row</strong> to open the add-day-off dialog. See the <em>My days off</em> section below for details.</p>
          </section>

          <!-- ── My days off ─────────────────────────────── -->
          <section id="days-off">
            <h2><mat-icon>beach_access</mat-icon> My days off</h2>
            <h3>Adding a day off</h3>
            <p>Click any date cell in your own row in the schedule. The add-day-off dialog opens.</p>
            <ol>
              <li>Set the <strong>start date</strong> and <strong>end date</strong>. For a single day, both dates are the same.</li>
              <li>Choose the <strong>day part</strong> for the first day: full day, morning only, or afternoon only.</li>
              <li>For multi-day entries, choose the day part for the <strong>last day</strong> as well.</li>
              <li>Optionally select a <strong>leave type</strong> (if your organisation has configured any) and add a <strong>description</strong>.</li>
              <li>Click <strong>Save</strong>.</li>
            </ol>
            <div class="tip">
              <mat-icon>info</mat-icon>
              <span>Half-day entries show a split cell in the schedule: the top half represents the morning, the bottom half the afternoon.</span>
            </div>

            <h3>Editing an existing entry</h3>
            <p>Click a coloured cell in your row. The dialog opens in edit mode. Change any field and click <strong>Save</strong>, or click <strong>Delete</strong> to remove the entry entirely.</p>

            <h3>Viewing in your account</h3>
            <p>Under <strong>Account → My days off</strong> you can see a list of all your personal leave entries and remove any of them.</p>
          </section>

          <!-- ── My account ──────────────────────────────── -->
          <section id="account">
            <h2><mat-icon>manage_accounts</mat-icon> My account</h2>
            <h3>Profile</h3>
            <p>Click the account icon in the navigation rail and choose <strong>Account</strong>. You can update:</p>
            <ul>
              <li><strong>First name, particles (tussenvoegsel), last name</strong></li>
              <li><strong>Email address</strong> — also used to log in</li>
              <li><strong>Phone number</strong> and <strong>date of birth</strong></li>
            </ul>
            <p>Changes are saved automatically when you move to the next field.</p>

            <h3>Profile photo</h3>
            <p>Click your avatar (the round image or initials at the top of the form) to upload a photo. Supported formats: JPEG, PNG. The image is cropped to a square and stored in the system.</p>

            <h3>Changing your password</h3>
            <p>In the account menu, choose <strong>Change password</strong>. Enter your current password, then your new password twice. Click <strong>Change password</strong> to confirm.</p>

            <h3>Schedule visibility</h3>
            <p>At the bottom of your account page, you can toggle <strong>Exclude me from the schedule</strong>. When enabled, your row is hidden from the schedule for all users.</p>
          </section>

          <!-- ── For team leaders ────────────────────────── -->
          <section id="team-leaders">
            <h2><mat-icon>group</mat-icon> For team leaders</h2>
            <h3>Your role</h3>
            <p>As a <strong>team admin</strong> you can manage leave entries for all members of your team. Your own leave works the same way as for regular members.</p>

            <h3>Editing a team member's leave</h3>
            <p>In the schedule, click any cell in a <strong>team member's row</strong> (not your own). The add/edit dialog opens and you can add, change or delete their leave entry. You can only do this for members of teams where you are a team admin.</p>

            <h3>Management access</h3>
            <p>Under <strong>Management → Members</strong> you can view all members in your organisation. Under <strong>Management → Teams</strong> you can view the teams you administer.</p>
          </section>

          <!-- ── For organisation admins ─────────────────── -->
          <section id="org-admins">
            <h2><mat-icon>admin_panel_settings</mat-icon> For organisation admins</h2>

            <h3>Adding members</h3>
            <p>Go to <strong>Management → Members</strong> and click the <strong>+</strong> button.</p>
            <ol>
              <li>Enter the person's <strong>email address</strong> and click <em>Check</em>.</li>
              <li>If the address is already registered in TeamSchedule, the person's details are shown. Click <strong>Add member</strong> to create a membership in your organisation — no new account is created.</li>
              <li>If the address is not yet registered, fill in the person's name and set an initial password. Optionally assign them to one or more teams.</li>
            </ol>
            <div class="tip">
              <mat-icon>info</mat-icon>
              <span>The member receives no automatic notification. Share their email address and initial password with them directly.</span>
            </div>

            <h3>Managing teams</h3>
            <p>Go to <strong>Management → Teams</strong>.</p>
            <ul>
              <li>Click <strong>+</strong> to create a new team and optionally assign members.</li>
              <li>Click a team row to open its detail panel: rename it, add/remove members, and assign team admins.</li>
            </ul>

            <h3>Member roles</h3>
            <ul>
              <li><strong>Member</strong> — can manage their own leave only.</li>
              <li><strong>Team admin</strong> — can manage leave for their team members. Assigned per team.</li>
              <li><strong>Org admin</strong> — full management access to the organisation.</li>
            </ul>
            <p>To change a member's role, open them in the Members list and use the Roles section in the edit panel.</p>

            <h3>Organisation settings</h3>
            <p>Go to <strong>Management → Organisation</strong> and expand the <em>Settings</em> section.</p>
            <ul>
              <li><strong>Working days</strong> — choose which days of the week count as working days. Non-working days appear grey in the schedule.</li>
              <li><strong>Week start</strong> — Monday or Sunday.</li>
              <li><strong>Schedule date range</strong> — the period shown in the schedule. Changing this permanently removes any leave entries that fall outside the new range.</li>
              <li><strong>Colours</strong> — customise the colour of non-working days, public holidays, scheduled days off, and no-contract days, for both light and dark theme.</li>
              <li><strong>Leave types</strong> — define up to 4 custom leave types (e.g. Illness, Study leave) with their own colours. Members can select a type when adding a day off.</li>
            </ul>
          </section>

          <!-- ── For system administrators (sysadmin only) ─ -->
          <section id="sysadmin" *ngIf="authService.isSysadmin">
            <h2><mat-icon>security</mat-icon> For system administrators</h2>

            <h3>Logging in</h3>
            <p>Use <strong>sysadmin</strong> as the email address and the system administrator password. The sysadmin account has no organisation and no schedule — it can only manage organisations and system-wide settings.</p>

            <h3>Managing organisations</h3>
            <p>Go to <strong>Management → Organisations</strong>.</p>
            <ul>
              <li>Click <strong>+</strong> to create a new organisation.</li>
              <li>Click an organisation row to open its detail panel: rename it, assign or remove org admins, and access its settings.</li>
              <li>An organisation can only be deleted when it has no members and no teams.</li>
            </ul>

            <h3>Demo organisations</h3>
            <p>When a visitor requests a demo on the home page, a demo organisation is created with pre-filled data and a 7-day expiry. Go to <strong>Management → Demos</strong> to see active demo organisations.</p>
            <ul>
              <li>Demo organisations expire and are cleaned up automatically.</li>
              <li>Click <strong>Terminate</strong> to immediately delete a demo and all its data.</li>
              <li>When a demo admin converts their demo to a real account (via Management → Organisation), the demo flag is removed and the organisation becomes permanent.</li>
            </ul>

            <h3>Email settings</h3>
            <p>Go to <strong>Management → System settings</strong> to configure the SMTP server used for password reset emails. Fill in the host, port, encryption type, credentials, and sender address. Use <strong>Send test email</strong> to verify the configuration.</p>

            <h3>Event log</h3>
            <p>Go to <strong>Management → Event log</strong> to view an audit trail of security and administrative events: logins (successful and failed), password resets, demo requests, org changes, and more. Use the filter to narrow by event type.</p>
          </section>

        </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .docs-page {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /* ── Sidebar ── */
    .docs-sidebar {
      width: 220px;
      flex-shrink: 0;
      overflow-y: auto;
      padding: 48px 16px 48px 24px;
      border-right: 1px solid var(--mat-sys-outline-variant);
    }

    .sidebar-heading {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 12px;
    }

    .sidebar-link {
      display: block;
      padding: 5px 0;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
      cursor: pointer;
      text-decoration: none;
      border-left: 2px solid transparent;
      padding-left: 10px;
      transition: color 0.15s, border-color 0.15s;
    }

    .sidebar-link:hover {
      color: var(--mat-sys-primary);
      border-left-color: var(--mat-sys-primary);
    }

    .sysadmin-link {
      margin-top: 8px;
      color: var(--mat-sys-tertiary);
    }

    .sysadmin-link:hover {
      color: var(--mat-sys-tertiary);
      border-left-color: var(--mat-sys-tertiary);
    }

    /* ── Content ── */
    .docs-content {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
      padding: 48px 24px 80px;
      max-width: 840px;
    }

    .docs-title {
      font-size: 28px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      margin: 0 0 48px;
    }

    section {
      margin-bottom: 56px;
      scroll-margin-top: 24px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
      margin: 0 0 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    h2 mat-icon {
      color: var(--mat-sys-primary);
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    #sysadmin h2 mat-icon { color: var(--mat-sys-tertiary); }

    h3 {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mat-sys-on-surface-variant);
      margin: 24px 0 8px;
    }

    p {
      font-size: 14px;
      line-height: 1.7;
      color: var(--mat-sys-on-surface);
      margin: 0 0 12px;
    }

    ul, ol {
      margin: 0 0 12px;
      padding-left: 20px;
    }

    li {
      font-size: 14px;
      line-height: 1.7;
      color: var(--mat-sys-on-surface);
      margin-bottom: 4px;
    }

    strong {
      font-weight: 600;
      color: var(--mat-sys-on-surface);
    }

    .tip {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
      border-radius: 8px;
      padding: 12px 14px;
      margin: 12px 0;
      font-size: 13px;
      line-height: 1.6;
    }

    .tip mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* ── Mobile ── */
    @media (max-width: 700px) {
      :host { overflow: auto; }
      .docs-page {
        flex-direction: column;
        overflow: visible;
        flex: none;
      }
      .docs-sidebar {
        width: 100%;
        overflow-y: visible;
        padding: 24px 16px 8px;
        border-right: none;
        border-bottom: 1px solid var(--mat-sys-outline-variant);
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
      }
      .docs-content {
        overflow-y: visible;
        padding: 24px 16px 60px;
        max-width: 100%;
      }
      .sidebar-heading { width: 100%; margin-bottom: 4px; }
      .sidebar-link {
        border-left: none;
        padding-left: 0;
        border-bottom: 2px solid transparent;
        padding-bottom: 2px;
      }
      .sidebar-link:hover { border-bottom-color: var(--mat-sys-primary); border-left-color: transparent; }
    }
  `]
})
export class DocsComponent {
  constructor(public authService: AuthService) {}

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
