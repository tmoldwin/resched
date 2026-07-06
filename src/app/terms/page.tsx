import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — resched",
  description: "Terms and conditions for using resched.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of resched
        (&quot;the Service&quot;). By accessing or using the Service, you agree to these Terms. If
        you do not agree, do not use the Service.
      </p>

      <h2>Description of the Service</h2>
      <p>
        resched is a web-based scheduling tool that lets users create events, share links, and collect
        availability from participants. Features may change over time as we improve the product.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be at least 13 years old to use the Service. If you are using the Service on behalf
        of an organization, you represent that you have authority to bind that organization to these
        Terms.
      </p>

      <h2>Accounts and Access</h2>
      <p>
        You may use certain features without an account. If you choose to sign in, you are responsible
        for maintaining the security of your account credentials and for all activity that occurs
        under your account. Notify us promptly of any unauthorized use.
      </p>

      <h2>User Content</h2>
      <p>
        You may submit content such as event names, participant names, and availability selections
        (&quot;User Content&quot;). You retain ownership of your User Content. You grant us a
        non-exclusive, worldwide, royalty-free license to host, store, display, and process User
        Content solely to operate and provide the Service.
      </p>
      <p>
        You are solely responsible for User Content you submit and for ensuring you have the right to
        share it. Do not submit content that is unlawful, misleading, infringing, or harmful.
      </p>

      <h2>Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose;</li>
        <li>Attempt to gain unauthorized access to the Service or related systems;</li>
        <li>Interfere with or disrupt the Service, including by automated scraping or abuse;</li>
        <li>Upload malware or content that violates the rights of others;</li>
        <li>Use the Service to send spam or unsolicited communications.</li>
      </ul>
      <p>
        We may suspend or terminate access if we reasonably believe you have violated these Terms or
        pose a risk to the Service or other users.
      </p>

      <h2>Event Links and Shared Access</h2>
      <p>
        Event links may be shared by organizers and participants. Anyone with access to a link may be
        able to view event information and responses. You are responsible for how you distribute
        links and what information you include in events.
      </p>

      <h2>Intellectual Property</h2>
      <p>
        The Service, including its software, design, and branding, is owned by us or our licensors and
        is protected by applicable intellectual property laws. These Terms do not grant you any right
        to use our trademarks or branding except as necessary to use the Service in accordance with
        these Terms.
      </p>

      <h2>Third-Party Services</h2>
      <p>
        The Service may integrate with third-party services such as authentication providers and
        hosting infrastructure. Your use of those services may be subject to separate terms and
        privacy policies.
      </p>

      <h2>Disclaimer of Warranties</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
        ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS
        FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
        UNINTERRUPTED, ERROR-FREE, OR SECURE.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR AFFILIATES, OFFICERS, EMPLOYEES, AND
        AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
        DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF
        THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS OR THE SERVICE WILL
        NOT EXCEED THE GREATER OF ONE HUNDRED U.S. DOLLARS (US $100) OR THE AMOUNT YOU PAID US, IF
        ANY, IN THE TWELVE MONTHS BEFORE THE CLAIM.
      </p>

      <h2>Indemnification</h2>
      <p>
        You agree to indemnify and hold us harmless from claims, damages, losses, and expenses
        (including reasonable legal fees) arising out of your use of the Service, your User Content,
        or your violation of these Terms.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate the Service or your
        access at any time, with or without notice. Sections that by their nature should survive
        termination will survive, including disclaimers, limitations of liability, and indemnification.
      </p>

      <h2>Governing Law</h2>
      <p>
        These Terms are governed by the laws applicable in the jurisdiction where the operator of
        resched is located, without regard to conflict-of-law principles. Any disputes will be resolved
        in the courts of that jurisdiction, unless otherwise required by applicable law.
      </p>

      <h2>Changes to These Terms</h2>
      <p>
        We may modify these Terms from time to time. We will post the updated Terms on this page and
        update the &quot;Last updated&quot; date. Your continued use of the Service after changes
        become effective constitutes acceptance of the revised Terms.
      </p>
    </LegalPage>
  );
}
