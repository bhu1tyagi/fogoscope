import dynamic from "next/dynamic";

export const TVChart = dynamic(
  () => import("./TVChart").then((m) => m.TVChart),
  {
    ssr: false,
    loading: () => (
      <div
        className="bg-bg-card rounded-xl animate-pulse"
        style={{ height: 300 }}
      />
    ),
  }
);
