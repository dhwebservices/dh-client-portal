const GUIDES = [
  {
    q: 'How do I ask for a change to my website?',
    a: 'Go to Requests and pick the kind of change: opening hours, an offer, menu or prices, new photos, or something else. Fill it in and press Send. You’ll get an email when we reply or finish it, and you can reply on the same request if anything else comes up.',
  },
  {
    q: 'How do I send you photos or my logo?',
    a: 'Use Files → From you, or attach them to a change request. Photos straight from your phone are fine. The biggest file size is 10 MB; for videos or very large files, send us a link (WeTransfer, Google Drive, Dropbox).',
  },
  {
    q: 'What makes a good website photo?',
    a: 'Landscape (sideways) photos work best for the top of a page. Take them in daylight, keep the lens clean, and avoid zooming. Real photos of your place, team and products always beat stock photos. Send as many as you like and we’ll pick the best.',
  },
  {
    q: 'How do I approve a design?',
    a: 'When we have something for you to check, it appears under Project → Designs to approve and we email you. Open it, then press Approve, or Ask for changes and tell us what you’d like different.',
  },
  {
    q: 'What do the visit stats mean?',
    a: 'Page views count every page someone opens on your site. Enquiries count contact forms sent from it. “Where visitors came from” shows the site that sent them, like Google or Facebook; “Direct” means they typed your address or used a bookmark. We don’t use cookies or collect anything personal.',
  },
  {
    q: 'How do I keep my Google listing up to date?',
    a: 'Your Google Business Profile is what shows in Google Maps and search. Keep your opening hours, phone number and photos the same as your website, reply to reviews, and add holiday hours before bank holidays. If you’d like us to update it for you, ask in Requests.',
  },
  {
    q: 'How do I pay an invoice?',
    a: 'Open Billing. If an invoice has a “Pay by card” button you can pay online there. Otherwise, pay by bank transfer using the details on the invoice. Paid invoices stay in Billing so you can find them for your accounts.',
  },
  {
    q: 'Who can sign in for my business?',
    a: 'Anyone we’ve added for you. There’s no password: you enter your email and we send a 6-digit code. To add or remove someone, ask us in Requests or ring 01443 805303.',
  },
]

export default function Help() {
  return (
    <div className="stack">
      <section className="section">
        <h2>Help</h2>
        <div className="faq">
          {GUIDES.map((g) => (
            <details key={g.q}>
              <summary>{g.q}</summary>
              <p>{g.a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Talk to us</h2>
        <p>Ring <b>01443 805303</b>, Monday to Friday, 9 to 5, or email <a href="mailto:clients@dhwebsiteservices.co.uk">clients@dhwebsiteservices.co.uk</a>.</p>
        <p className="hint" style={{ marginTop: 8 }}>David and Jack, DH Website Services, Pontypridd.</p>
      </section>
    </div>
  )
}
