import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "../components/ui/core";

const features = [
  {
    title: "Escrow Protection",
    description: "Your payment is locked in escrow until you approve the work. No risk of not getting paid.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    color: "emerald",
  },
  {
    title: "AI Milestones",
    description: "Projects are split into clear milestones. You get paid for each one you complete.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    color: "blue",
  },
  {
    title: "Fair Dispute Resolution",
    description: "If something goes wrong, our AI helps find a fair resolution. No more ghosting.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
    color: "violet",
  },
];

const testimonials = [
  {
    quote: "Finally, a platform that treats freelancers with respect. Got paid on time for the first time in months.",
    author: "Priya S.",
    role: "Frontend Developer",
    avatar: "P",
  },
  {
    quote: "The milestone system helped me avoid scope creep. Client knew exactly what they'd get at each step.",
    author: "Rahul M.",
    role: "Backend Developer",
    avatar: "R",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 to-white -z-10" />
        
        <div className="max-w-5xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="text-center max-w-3xl mx-auto">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-secondary-200 shadow-sm mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
              </span>
              <span className="text-sm font-medium text-secondary-700">
                Trusted by 10,000+ freelancers
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary-900 tracking-tight leading-[1.1] mb-6">
              Get paid for your work,
              <span className="text-brand-600"> guaranteed.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-secondary-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Stop chasing invoices. Trust-Bound holds payments in escrow until you're satisfied with each milestone.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                variant="primary" 
                size="lg"
                onClick={() => navigate("/register")}
                className="w-full sm:w-auto px-8"
              >
                Start free — No credit card
              </Button>
              <Button 
                variant="ghost" 
                size="lg"
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto px-6"
              >
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Compact Version */}
      <section className="bg-secondary-50 border-y border-secondary-100">
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
          <h2 className="text-center text-sm font-semibold text-secondary-500 uppercase tracking-wider mb-8">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Create project", desc: "Define scope & budget" },
              { step: "2", title: "Deposit escrow", desc: "Client adds funds" },
              { step: "3", title: "Complete milestones", desc: "Get work approved" },
              { step: "4", title: "Get paid", desc: "Instant release" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold text-secondary-900 mb-1">{item.title}</h3>
                <p className="text-sm text-secondary-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-secondary-900 mb-4">
            Built for freelancers
          </h2>
          <p className="text-secondary-600 max-w-xl mx-auto">
            Everything you need to run your freelance business with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card 
              key={feature.title} 
              className="p-6 border-0 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                feature.color === 'emerald' ? 'bg-brand-50 text-brand-600' :
                feature.color === 'blue' ? 'bg-primary-50 text-primary-600' :
                'bg-accent-50 text-accent-600'
              }`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-secondary-600 leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="bg-secondary-50 border-t border-secondary-100">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-secondary-900 mb-12">
            Loved by freelancers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.author} className="p-6 border-0">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center flex-shrink-0">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-secondary-700 leading-relaxed mb-3">
                      "{testimonial.quote}"
                    </p>
                    <div>
                      <p className="font-medium text-secondary-900">{testimonial.author}</p>
                      <p className="text-sm text-secondary-500">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <div className="bg-secondary-900 rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to get paid what you're worth?
          </h2>
          <p className="text-secondary-300 mb-8 max-w-md mx-auto">
            Join thousands of freelancers who've stopped chasing payments.
          </p>
          <Button 
            variant="primary"
            size="lg"
            onClick={() => navigate("/register")}
            className="bg-white text-black hover:bg-secondary-100"
          >
            Create free account
          </Button>
          <p className="text-sm text-secondary-400 mt-4">
            Free forever. No platform fees.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-secondary-100">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="font-semibold text-secondary-900">Trust-Bound</span>
          </div>
          <p className="text-sm text-secondary-500">
            Secure payments for freelancers.
          </p>
        </div>
      </footer>
    </div>
  );
}
