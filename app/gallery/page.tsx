/* eslint-disable @next/next/no-img-element */
"use client";

import TopNavBar from "@/components/ui/TopNavBar";
import BottomNavBar from "@/components/ui/BottomNavBar";

const GALLERY_ROW = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCU8uRuNyk2JDRJFb-EIDQ3kyrjMRtd7IJdsd1c6d2OhKXSIpg71VoLPooUrYDgxP2qoDc2tobk0vFI1vA6VXA6tGnMoGAzgltLjvHyjz_SbLAPeXD6n3m1Hg2B6LgbRsBHPaT-TDksQ049loA-2NCshWZmhPoNQMxQhars3uEyOuBRccOT20ijIQ1VmWBjzug7ikF5J-V4SASAqVrcSAANCFCGXV8ePksD_dO0p5O1F0e3ycNm5BeN7weJtWcF80m0MK2jdtGPiTE",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCjiwRUvB7iRb9FLrmvFSNbg6af_XQsvRlsxSXf8yWg40HdXR2wIjA0qE_Iomj3dka6JU4kEIOFQZv8nys2kFdZJsnXkSQFvDffejICwSRNCXachv2Aaw0EWzMfM8REN5gDpja-P4HiL0mynvwtq0MvWGs3EkPx4y-1pWOggoSM9liBE7ScJCBdplalERfL1bf8Ln5SVS1YMo0btNigs21LfaCTQ41y4uJWH75J0wEuISl4jDmivFEnq_G8BknDWeCWCcxRExfldz0",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCRymOUpQykMrGWv5ftQrCI4IpNsJAaMrmlI-LjukG0hP2KSSSjLiDhMrFuhAfaiYwmaZpvZnpvVvpmRtVe6oOfTTIdTHLZZZGxCXeaKyJpJxWEpozSgDca2kjK-UV3ZRbv4mYdPlXO0S48Pbiw9n2l3rty-nPZchP-yIqYSquV9cpnbHAXUCibu3lxnpTupCo3ORBOyao3jqx217z3IDyH6IU3tAI3gWOr6PlvijBuIAwGaEl3dmutwA4l7HU5DLwCJ11ttp0jk1o",
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-surface">
      <TopNavBar />

      <main className="pt-24 px-8 pb-24 w-full max-w-screen-2xl mx-auto">
        {/* Header */}
        <header className="mb-16 text-center max-w-4xl mx-auto">
          <h1 className="text-6xl font-jakarta italic font-semibold text-primary mb-4">
            Ideas made by{" "}
            <span className="text-secondary">our community</span>
          </h1>
          <p className="text-on-surface/70 font-jakarta text-xl">
            Every keepsake tells a story. See how our makers bring warmth to
            their homes.
          </p>
        </header>

        {/* Gallery grid */}
        <div className="grid grid-cols-12 gap-8">
          {/* Featured row */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-[2rem] overflow-hidden border border-outline/20">
            <div className="grid grid-cols-3 h-[400px]">
              {GALLERY_ROW.map((src, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden ${
                    i < GALLERY_ROW.length - 1
                      ? "border-r border-outline/10"
                      : ""
                  }`}
                >
                  <img
                    src={src}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>
              ))}
            </div>
            <div className="p-8 flex justify-between items-center bg-surface-container/30">
              <p className="font-jakarta text-lg italic">
                &ldquo;A warm glow for Grandma&apos;s 80th birthday...&rdquo; —
                Sarah J.
              </p>
              <button className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center">
                <span className="material-symbols-outlined">favorite</span>
              </button>
            </div>
          </div>

          {/* Side card */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-[2rem] overflow-hidden border border-outline/20 p-8 flex flex-col">
            <h3 className="font-jakarta text-2xl font-bold italic mb-4">
              Winter Traditions
            </h3>
            <div className="h-64 relative bg-stone-100 mb-6">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDU4wvaoCOrbbTzeXY7uKlm9GCDXehZPVmf15wwgFBuhORTpnE8k2BayCYAtdBd2scMdIAvUMOk5eBLQ5SPxz10zlZs1z7cRwj6p3vsZutQUz4blUgj27zsGwJcbRndjZeuKdOHYoctUDdf-MjhARokFLP-Aphe4tAsKYu1dUSPh5y7fJfPzxrH19n9ujz-zDfZXPfxM_5K3ZHAbcG5vf8bus4VGxdtBVx1SV3gUE8paaKhYdevEyiABOzcHQb0ibawZOWkyMAH9o"
                className="w-full h-full object-cover opacity-80"
                alt="Winter Traditions"
              />
            </div>
            <div className="mt-auto bg-surface-container rounded-2xl p-4">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span>Innovation Goal</span>
                <span>82%</span>
              </div>
              <div className="w-full h-2 bg-white rounded-full">
                <div className="h-full bg-primary w-[82%] rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
