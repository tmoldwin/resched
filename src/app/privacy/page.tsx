import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — resched",
  description: "How resched collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        resched (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates a group scheduling service that
        helps people find overlapping availability. This Privacy Policy explains what information we
        collect, how we use it, and the choices you have.
      </p>

      <h2>Information We Collect</h2>
      <p>We collect information in the following ways:</p>
      <ul>
        <li>
          <strong>Account information.</strong> If you sign in with Google, we receive your name,
          email address, profile image, and Google account identifier. We store this to identify your
          account and associate events you create with you.
        </li>
        <li>
          <strong>Event and availability data.</strong> When you create or join an event, we collect
          the event details you provide (such as name, date range, and time settings) and
          availability selections you submit. Participants may provide a display name without creating
          an account.
        </li>
        <li>
          <strong>Technical data.</strong> We may collect standard log and usage information such as
          IP address, browser type, device information, and pages visited. This helps us operate,
          secure, and improve the service.
        </li>
        <li>
          <strong>Cookies and session data.</strong> We use cookies and similar technologies to keep
          you signed in, remember event edit access, and maintain basic session state.
        </li>
      </ul>

      <h2>How We Use Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve the scheduling service;</li>
        <li>Authenticate users and manage accounts;</li>
        <li>Store and display event and availability data to event organizers and participants;</li>
        <li>Protect against abuse, fraud, and security incidents;</li>
        <li>Comply with legal obligations.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>How We Share Information</h2>
      <p>We may share information in these limited circumstances:</p>
      <ul>
        <li>
          <strong>With other participants.</strong> Names and availability you submit for an event are
          visible to others who can access that event&apos;s link.
        </li>
        <li>
          <strong>With service providers.</strong> We use third-party providers for hosting,
          authentication, and database services. These providers process data on our behalf and are
          subject to contractual obligations to protect it.
        </li>
        <li>
          <strong>For legal reasons.</strong> We may disclose information if required by law or if we
          believe disclosure is necessary to protect rights, safety, or the integrity of the service.
        </li>
      </ul>

      <h2>Data Retention</h2>
      <p>
        We retain account, event, and availability data for as long as needed to provide the service
        or until you delete it where deletion is supported. We may retain certain information longer
        when required for security, legal compliance, or dispute resolution.
      </p>

      <h2>Your Choices</h2>
      <ul>
        <li>You may use many features without signing in.</li>
        <li>
          If you sign in with Google, you can revoke access through your Google account settings.
        </li>
        <li>
          You may request access to, correction of, or deletion of personal information we hold about
          you by contacting us.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        We use reasonable administrative, technical, and organizational measures to protect
        information. No method of transmission or storage is completely secure, and we cannot
        guarantee absolute security.
      </p>

      <h2>Children&apos;s Privacy</h2>
      <p>
        resched is not directed to children under 13, and we do not knowingly collect personal
        information from children under 13. If you believe a child has provided us personal
        information, please contact us so we can take appropriate action.
      </p>

      <h2>International Users</h2>
      <p>
        If you access the service from outside the country where our servers are located, your
        information may be transferred to, stored in, and processed in other countries where data
        protection laws may differ.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the revised policy on this
        page and update the &quot;Last updated&quot; date. Continued use of the service after changes
        become effective constitutes acceptance of the revised policy.
      </p>
    </LegalPage>
  );
}
