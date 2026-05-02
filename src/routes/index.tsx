import { createFileRoute } from "@tanstack/react-router";
import { Softboard } from "@/components/softboard/Softboard";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Softboard — Your personal pinboard" },
      {
        name: "description",
        content:
          "Softboard is a local-first corkboard for notes, images, audio and documents. Connect ideas with colored strings. Save and load your board as a file.",
      },
      { property: "og:title", content: "Softboard — Your personal pinboard" },
      {
        property: "og:description",
        content:
          "Pin notes, images, audio and docs. Connect them with colored strings. Save locally to your PC.",
      },
    ],
  }),
});

function Index() {
  return (
    <>
      <Softboard />
      <Toaster position="bottom-right" />
    </>
  );
}
