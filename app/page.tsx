"use client";

import { useEffect, useRef, useState } from "react";

type Block =
  | {
      id: string;
      type: "text";
      content: string;
    }
  | {
      id: string;
      type: "link";
      url: string;
    }
  | {
      id: string;
      type: "image";
      src: string;
    };

type DayEntry = {
  blocks: Block[];
};

const emptyEntry: DayEntry = {
  blocks: [{ id: "first-block", type: "text", content: "" }],
};

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function formatDateForDisplay(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${day}.${month}.${year}`;
}

function getLinkHost(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function createEmptyEntry(): DayEntry {
  return {
    blocks: [{ id: crypto.randomUUID(), type: "text", content: "" }],
  };
}

function normalizeEntry(parsedEntry: any): DayEntry {
  if (parsedEntry && parsedEntry.blocks && Array.isArray(parsedEntry.blocks)) {
    return {
      blocks:
        parsedEntry.blocks.length > 0
          ? parsedEntry.blocks
          : [{ id: crypto.randomUUID(), type: "text", content: "" }],
    };
  }

  const convertedBlocks: Block[] = [];

  if (parsedEntry?.note) {
    convertedBlocks.push({
      id: crypto.randomUUID(),
      type: "text",
      content: parsedEntry.note,
    });
  }

  if (parsedEntry?.linkUrl) {
    convertedBlocks.push({
      id: crypto.randomUUID(),
      type: "link",
      url: parsedEntry.linkUrl,
    });
  }

  if (parsedEntry?.images && Array.isArray(parsedEntry.images)) {
    parsedEntry.images.forEach((image: { src?: string }) => {
      if (image.src) {
        convertedBlocks.push({
          id: crypto.randomUUID(),
          type: "image",
          src: image.src,
        });
      }
    });
  }

  if (convertedBlocks.length === 0) {
    convertedBlocks.push({
      id: crypto.randomUUID(),
      type: "text",
      content: "",
    });
  }

  return {
    blocks: convertedBlocks,
  };
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(getTodayKey());
  const [savedDates, setSavedDates] = useState<string[]>([getTodayKey()]);
  const [entry, setEntry] = useState<DayEntry>(emptyEntry);
  const [slashBlockId, setSlashBlockId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const [dateMenuOpen, setDateMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInsertAfterBlockId = useRef<string | null>(null);

  useEffect(() => {
    const allDates = localStorage.getItem("pinkfontbtw-dates");

    if (allDates) {
      try {
        const parsedDates = JSON.parse(allDates);

        if (Array.isArray(parsedDates)) {
          const datesWithToday = Array.from(
            new Set([...parsedDates, getTodayKey()])
          ) as string[];

          setSavedDates(datesWithToday.sort().reverse());
        }
      } catch {
        setSavedDates([getTodayKey()]);
      }
    }
  }, []);

  useEffect(() => {
    const savedEntry = localStorage.getItem(`pinkfontbtw-entry-${selectedDate}`);

    if (savedEntry) {
      try {
        const parsedEntry = JSON.parse(savedEntry);
        setEntry(normalizeEntry(parsedEntry));
      } catch {
        setEntry(createEmptyEntry());
      }
    } else {
      setEntry(createEmptyEntry());
    }

    setSlashBlockId(null);
    setDateMenuOpen(false);
  }, [selectedDate]);

  function updateTextBlock(id: string, content: string) {
    setEntry((currentEntry) => ({
      ...currentEntry,
      blocks: currentEntry.blocks.map((block) =>
        block.id === id && block.type === "text"
          ? { ...block, content }
          : block
      ),
    }));

    if (content.endsWith("/")) {
      setSlashBlockId(id);
    } else {
      setSlashBlockId(null);
    }
  }

  function insertBlockAfter(blockId: string, newBlock: Block) {
    setEntry((currentEntry) => {
      const blockIndex = currentEntry.blocks.findIndex(
        (block) => block.id === blockId
      );

      const newBlocks = [...currentEntry.blocks];

      if (blockIndex === -1) {
        newBlocks.push(newBlock);
      } else {
        newBlocks.splice(blockIndex + 1, 0, newBlock);
      }

      return {
        ...currentEntry,
        blocks: newBlocks,
      };
    });

    setSlashBlockId(null);
  }

  function removeSlashFromBlock(blockId: string) {
    setEntry((currentEntry) => ({
      ...currentEntry,
      blocks: currentEntry.blocks.map((block) => {
        if (block.id === blockId && block.type === "text") {
          return {
            ...block,
            content: block.content.replace(/\/$/, ""),
          };
        }

        return block;
      }),
    }));
  }

  function chooseText(blockId: string) {
    removeSlashFromBlock(blockId);
    insertBlockAfter(blockId, {
      id: crypto.randomUUID(),
      type: "text",
      content: "",
    });
  }

  function chooseLink(blockId: string) {
    removeSlashFromBlock(blockId);
    insertBlockAfter(blockId, {
      id: crypto.randomUUID(),
      type: "link",
      url: "",
    });
  }

  function chooseImage(blockId: string) {
    removeSlashFromBlock(blockId);
    imageInsertAfterBlockId.current = blockId;
    fileInputRef.current?.click();
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const blockId = imageInsertAfterBlockId.current;

    if (!file || !blockId) return;

    const reader = new FileReader();

    reader.onload = () => {
      insertBlockAfter(blockId, {
        id: crypto.randomUUID(),
        type: "image",
        src: reader.result as string,
      });
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function updateLinkBlock(id: string, url: string) {
    setEntry((currentEntry) => ({
      ...currentEntry,
      blocks: currentEntry.blocks.map((block) =>
        block.id === id && block.type === "link" ? { ...block, url } : block
      ),
    }));
  }

  function deleteBlock(id: string) {
    setEntry((currentEntry) => {
      const remainingBlocks = currentEntry.blocks.filter(
        (block) => block.id !== id
      );

      return {
        ...currentEntry,
        blocks:
          remainingBlocks.length > 0
            ? remainingBlocks
            : [{ id: crypto.randomUUID(), type: "text", content: "" }],
      };
    });
  }

  function handleSave() {
    const updatedDates = Array.from(new Set([selectedDate, ...savedDates]))
      .sort()
      .reverse();

    localStorage.setItem(
      `pinkfontbtw-entry-${selectedDate}`,
      JSON.stringify(entry)
    );
    localStorage.setItem("pinkfontbtw-dates", JSON.stringify(updatedDates));

    setSavedDates(updatedDates);
    setSavedMessage("saved");
    setTimeout(() => setSavedMessage(""), 1200);
  }

  return (
    <main className="min-h-screen w-full px-8 py-8 text-[#171412] md:px-12">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <section className="min-h-screen w-full">
        <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col pb-24 pt-4">
          <header className="flex items-center justify-center">
            <div className="relative">
              <button
                onClick={() => setDateMenuOpen((open) => !open)}
                className="date-pill inline-flex items-center gap-3 rounded-full px-5 py-2 text-3xl tracking-[-0.08em] text-[#bd6073] transition hover:opacity-75 md:text-4xl"
              >
                <span>{formatDateForDisplay(selectedDate)}</span>
                <span className="mt-1 text-sm">⌄</span>
              </button>

              {dateMenuOpen && (
                <div className="date-menu absolute left-1/2 top-full z-30 mt-3 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-[#bd6073]/10 bg-[#fff8f8]/80 p-2 shadow-2xl shadow-[#bd6073]/15 backdrop-blur-md">
                  {savedDates.map((date) => (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`block w-full rounded-xl px-4 py-2 text-center text-sm tracking-[-0.03em] transition ${
                        selectedDate === date
                          ? "bg-[#efbfd0]/70 text-[#171412]"
                          : "text-[#bd6073] hover:bg-[#f6d9e3]/60"
                      }`}
                    >
                      {formatDateForDisplay(date)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>

          <h1 className="mt-14 text-center text-2xl tracking-[-0.06em] text-[#bd6073] md:text-[2rem]">
            what is going on today...
          </h1>

          <div className="mt-14 space-y-6">
            {entry.blocks.map((block) => (
              <div key={block.id} className="group relative">
                {block.type === "text" && (
                  <>
                    <textarea
                      value={block.content}
                      onChange={(event) =>
                        updateTextBlock(block.id, event.target.value)
                      }
                      placeholder="type / for options..."
                      className="block min-h-10 w-full resize-none bg-transparent text-lg leading-relaxed tracking-[-0.03em] text-[#171412] outline-none placeholder:text-[#171412]/28 md:text-xl"
                    />

                    {slashBlockId === block.id && (
                      <div className="absolute left-0 top-full z-20 mt-2 w-44 rounded-md border border-[#171412]/8 bg-[rgba(255,250,248,0.92)] p-2 text-sm shadow-lg backdrop-blur-sm">
                        <button
                          onClick={() => chooseText(block.id)}
                          className="block w-full rounded px-3 py-2 text-left text-[#171412] hover:bg-[#f4dde3]"
                        >
                          text
                        </button>

                        <button
                          onClick={() => chooseLink(block.id)}
                          className="block w-full rounded px-3 py-2 text-left text-[#171412] hover:bg-[#f4dde3]"
                        >
                          embed link
                        </button>

                        <button
                          onClick={() => chooseImage(block.id)}
                          className="block w-full rounded px-3 py-2 text-left text-[#171412] hover:bg-[#f4dde3]"
                        >
                          paste picture
                        </button>
                      </div>
                    )}
                  </>
                )}

                {block.type === "link" && (
                  <div className="rounded-sm bg-[#efbfd0]/70 px-5 py-4">
                    <input
                      value={block.url}
                      onChange={(event) =>
                        updateLinkBlock(block.id, event.target.value)
                      }
                      placeholder="paste link..."
                      className="w-full bg-transparent text-center text-base tracking-[-0.03em] text-[#171412] outline-none placeholder:text-[#171412]/45 md:text-lg"
                    />

                    {block.url && (
                      <a
                        href={block.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block text-center text-xs text-[#171412]/55 underline-offset-4 hover:underline"
                      >
                        {getLinkHost(block.url)}
                      </a>
                    )}
                  </div>
                )}

                {block.type === "image" && (
                  <img
                    src={block.src}
                    alt="daily visual"
                    className="max-h-[520px] w-full object-contain"
                  />
                )}

                <button
                  onClick={() => deleteBlock(block.id)}
                  className="absolute right-0 top-0 hidden rounded-sm bg-[#f0c1d1]/75 px-2 py-1 text-xs text-[#8e4d5b] backdrop-blur-sm hover:bg-[#ecb5c8] group-hover:block"
                >
                  remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="fixed bottom-7 right-8 flex items-center gap-3 md:bottom-8 md:right-10">
          {savedMessage && (
            <p className="text-sm tracking-[-0.04em] text-[#bd6073]/65">
              {savedMessage}
            </p>
          )}

          <button
            onClick={handleSave}
            className="text-2xl tracking-[-0.07em] text-[#bd6073] transition hover:opacity-65 md:text-3xl"
          >
            save
          </button>
        </div>
      </section>
    </main>
  );
}