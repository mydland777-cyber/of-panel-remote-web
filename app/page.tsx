"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PanelKey = "A" | "D";
type SlotKey = "S1" | "S2" | "S3" | "S4";
type TunnelStatus = "checking" | "ok" | "ng";
type ToggleKey = "guardOn" | "revCutOn" | "tp30On";

type SlotData = {
  id: SlotKey;
  symbol: string;
  lot: string;
  pips: string;
  pl: string;
  dayPips: string;
  dayPl: string;
  buyPrice: string;
  spread: string;
  sellPrice: string;
  hasPosition: boolean;
  guardOn: boolean;
  revCutOn: boolean;
  tp30On: boolean;
};

type PanelData = {
  title: string;
  slots: SlotData[];
};

type BridgeStateSlot = {
  slot: SlotKey;
  ok: boolean;
  ts?: number | null;
  panel?: string;
  symbol?: string;
  tf?: number | null;
  balance?: number;
  equity?: number;
  free?: number;
  digits?: number | null;
  bid?: number;
  ask?: number;
  spread?: number;
  spread_points?: number;
  pos_lots?: number;
  pos_dir?: number;
  pips?: number;
  pl?: number;
  day_pips?: number;
  day_profit?: number;
  acc_ccy?: string;
  tick_value?: number;
  tick_size?: number;
  pip_size?: number;
  commission_side?: number;
};

type BridgeStateResponse = {
  ok: boolean;
  panel: PanelKey;
  now: string;
  slots: BridgeStateSlot[];
};

type SlotToggleState = {
  guardOn: boolean;
  revCutOn: boolean;
  tp30On: boolean;
};

type PanelToggleMap = Record<PanelKey, Record<SlotKey, SlotToggleState>>;

const SLOT_SYMBOLS: Record<SlotKey, string> = {
  S1: "USDJPY+",
  S2: "EURJPY+",
  S3: "EURAUD+",
  S4: "GBPAUD+",
};

function createEmptyPanelData(panel: PanelKey): PanelData {
  return {
    title: `[${panel}] O&F Trade Panel`,
    slots: (["S1", "S2", "S3", "S4"] as SlotKey[]).map((id) => ({
      id,
      symbol: SLOT_SYMBOLS[id],
      lot: "0.01",
      pips: "0.0",
      pl: "0",
      dayPips: "0.0",
      dayPl: "0",
      buyPrice: "0",
      spread: "0",
      sellPrice: "0",
      hasPosition: false,
      guardOn: false,
      revCutOn: false,
      tp30On: false,
    })),
  };
}

function createInitialToggleMap(): PanelToggleMap {
  const slots = ["S1", "S2", "S3", "S4"] as SlotKey[];
  return {
    A: Object.fromEntries(
      slots.map((slot) => [slot, { guardOn: false, revCutOn: false, tp30On: false }])
    ) as Record<SlotKey, SlotToggleState>,
    D: Object.fromEntries(
      slots.map((slot) => [slot, { guardOn: false, revCutOn: false, tp30On: false }])
    ) as Record<SlotKey, SlotToggleState>,
  };
}

const INITIAL_PANEL_DATA: Record<PanelKey, PanelData> = {
  A: createEmptyPanelData("A"),
  D: createEmptyPanelData("D"),
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundToStepFloor(value: number, step: number) {
  if (!(step > 0)) return value;
  return Math.floor(value / step + 1e-10) * step;
}

function formatSignedNumber(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value).toFixed(digits);
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return Number(0).toFixed(digits);
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(Math.round(value)).toLocaleString("ja-JP");
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return "0";
}

function formatLot(value: number) {
  if (!Number.isFinite(value)) return "0.01";
  return value.toFixed(2);
}

function formatPrice(value: number, digits?: number | null) {
  if (!Number.isFinite(value)) return "0";
  if (typeof digits === "number" && digits >= 0) {
    return value.toFixed(digits);
  }
  return String(value);
}

function formatSpread(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(1);
}

function splitPriceForDisplay(price: string) {
  const text = String(price || "").trim();
  if (!text) {
    return { main: "0", last: "" };
  }
  if (text.length <= 1) {
    return { main: text, last: "" };
  }
  return {
    main: text.slice(0, -1),
    last: text.slice(-1),
  };
}

function calcDisplayedLotFromState(item: BridgeStateSlot) {
  const free = Number(item.free ?? 0);
  const balance = Number(item.balance ?? 0);
  const basis = free > 0 ? free : balance;

  if (!(basis > 0)) return "0.01";

  const rawLots = (basis * 2.0) / 100000.0;
  let lots = clamp(rawLots, 0.01, 300.0);
  lots = roundToStepFloor(lots, 0.01);

  if (lots < 0.01) lots = 0.01;

  return formatLot(Number(lots.toFixed(2)));
}

function mapBridgeStateToPanelData(
  panel: PanelKey,
  response: BridgeStateResponse,
  toggleMap: PanelToggleMap
): PanelData {
  const mappedSlots: SlotData[] = (["S1", "S2", "S3", "S4"] as SlotKey[]).map((slotId) => {
    const item = response.slots.find((s) => s.slot === slotId);
    const toggles = toggleMap[panel][slotId];

    if (!item || !item.ok) {
      return {
        id: slotId,
        symbol: SLOT_SYMBOLS[slotId],
        lot: "0.01",
        pips: "0.0",
        pl: "0",
        dayPips: "0.0",
        dayPl: "0",
        buyPrice: "0",
        spread: "0",
        sellPrice: "0",
        hasPosition: false,
        guardOn: false,
        revCutOn: false,
        tp30On: false,
      };
    }

    const posLots = Number(item.pos_lots ?? 0);
    const posDir = Number(item.pos_dir ?? 0);
    const digits = item.digits ?? null;
    const hasPosition = posDir !== 0 && posLots > 0;

    return {
      id: slotId,
      symbol: item.symbol || SLOT_SYMBOLS[slotId],
      lot: calcDisplayedLotFromState(item),
      pips: formatSignedNumber(Number(item.pips ?? 0), 1),
      pl: formatMoney(Number(item.pl ?? 0)),
      dayPips: formatSignedNumber(Number(item.day_pips ?? 0), 1),
      dayPl: formatMoney(Number(item.day_profit ?? 0)),
      buyPrice: formatPrice(Number(item.ask ?? 0), digits),
      spread: formatSpread(Number(item.spread ?? 0)),
      sellPrice: formatPrice(Number(item.bid ?? 0), digits),
      hasPosition,
      guardOn: hasPosition ? toggles.guardOn : false,
      revCutOn: hasPosition ? toggles.revCutOn : false,
      tp30On: hasPosition ? toggles.tp30On : false,
    };
  });

  return {
    title: `[${panel}] O&F Trade Panel`,
    slots: mappedSlots,
  };
}

function getPressStyle(pressed: boolean, disabled = false) {
  return {
    opacity: disabled ? 0.35 : pressed ? 0.85 : 1,
    transform: pressed ? "scale(0.98)" : "scale(1)",
    transition: "transform 0.06s ease, opacity 0.06s ease",
  };
}

export default function Home() {
  const [selectedPanel, setSelectedPanel] = useState<PanelKey>("A");
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>("S1");
  const [lastAction, setLastAction] = useState("未操作");
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus>("checking");
  const [panelDataMap, setPanelDataMap] = useState<Record<PanelKey, PanelData>>(INITIAL_PANEL_DATA);
  const [toggleMap, setToggleMap] = useState<PanelToggleMap>(createInitialToggleMap());

  const audioRef = useRef<Record<string, HTMLAudioElement | null>>({
    entry: null,
    entry_failed: null,
    guard: null,
    revcut: null,
    tp30: null,
    dten: null,
  });

  const audioUnlockedRef = useRef(false);

  const panel = useMemo(() => panelDataMap[selectedPanel], [panelDataMap, selectedPanel]);
  const slot = useMemo(() => {
    return panel.slots.find((item) => item.id === selectedSlot) ?? panel.slots[0];
  }, [panel, selectedSlot]);

  useEffect(() => {
    audioRef.current.entry = new Audio("/entry.wav");
    audioRef.current.entry_failed = new Audio("/entry_failed.wav");
    audioRef.current.guard = new Audio("/guard.wav");
    audioRef.current.revcut = new Audio("/revcut.wav");
    audioRef.current.tp30 = new Audio("/tp30.wav");
    audioRef.current.dten = new Audio("/dten.wav");

    Object.values(audioRef.current).forEach((audio) => {
      if (audio) {
        audio.preload = "auto";
        audio.setAttribute("playsinline", "true");
      }
    });
  }, []);

  useEffect(() => {
    const unlockAudio = async () => {
      if (audioUnlockedRef.current) return;

      const list = Object.values(audioRef.current).filter(Boolean) as HTMLAudioElement[];
      if (list.length === 0) return;

      audioUnlockedRef.current = true;

      for (const audio of list) {
        try {
          audio.muted = true;
          audio.currentTime = 0;
          await audio.play();
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        } catch {
          audio.muted = false;
        }
      }
    };

    const handler = () => {
      void unlockAudio();
    };

    window.addEventListener("touchstart", handler, { passive: true });
    window.addEventListener("pointerdown", handler, { passive: true });
    window.addEventListener("click", handler, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("click", handler);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchBridgeState() {
      try {
        const res = await fetch(`/api/bridge-state?panel=${selectedPanel}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          if (cancelled) return;
          setTunnelStatus("ng");
          return;
        }

        const data = (await res.json()) as BridgeStateResponse;

        if (cancelled) return;

        if (!data?.ok || !Array.isArray(data.slots)) {
          setTunnelStatus("ng");
          return;
        }

        setToggleMap((prev) => {
          const next = structuredClone(prev) as PanelToggleMap;
          for (const item of data.slots) {
            const posLots = Number(item.pos_lots ?? 0);
            const posDir = Number(item.pos_dir ?? 0);
            const hasPosition = posDir !== 0 && posLots > 0;
            if (!hasPosition && next[selectedPanel]?.[item.slot]) {
              next[selectedPanel][item.slot] = {
                guardOn: false,
                revCutOn: false,
                tp30On: false,
              };
            }
          }

          setPanelDataMap((panelPrev) => ({
            ...panelPrev,
            [selectedPanel]: mapBridgeStateToPanelData(selectedPanel, data, next),
          }));

          return next;
        });

        setTunnelStatus("ok");
      } catch {
        if (cancelled) return;
        setTunnelStatus("ng");
      }
    }

    fetchBridgeState();
    const timer = window.setInterval(fetchBridgeState, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedPanel]);

  function playSound(name: keyof typeof audioRef.current) {
    const audio = audioRef.current[name];
    if (!audio) return;

    try {
      const cloned = audio.cloneNode(true) as HTMLAudioElement;
      cloned.preload = "auto";
      cloned.setAttribute("playsinline", "true");
      cloned.currentTime = 0;
      void cloned.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  function setSlotToggle(panelKey: PanelKey, slotKey: SlotKey, key: ToggleKey, value: boolean) {
    setToggleMap((prev) => ({
      ...prev,
      [panelKey]: {
        ...prev[panelKey],
        [slotKey]: {
          ...prev[panelKey][slotKey],
          [key]: value,
        },
      },
    }));

    setPanelDataMap((prev) => ({
      ...prev,
      [panelKey]: {
        ...prev[panelKey],
        slots: prev[panelKey].slots.map((s) =>
          s.id === slotKey ? { ...s, [key]: value } : s
        ),
      },
    }));
  }

  function selectPanel(panelKey: PanelKey) {
    setSelectedPanel(panelKey);
    setSelectedSlot("S1");
    setLastAction(`Panel ${panelKey} を選択`);
  }

  function selectSlot(slotId: SlotKey) {
    setSelectedSlot(slotId);
    setLastAction(`Panel ${selectedPanel} / ${slotId} を選択`);
  }

  async function sendPanelAction(
    action: string,
    label: string,
    sound?: keyof typeof audioRef.current
  ) {
    setLastAction(`送信中: Panel ${selectedPanel} / ${slot.id} / ${label}`);

    if (sound) {
      playSound(sound);
    }

    try {
      const res = await fetch("/api/panel-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          panel: selectedPanel,
          slot: slot.id,
          action,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        playSound("entry_failed");
        setLastAction(`送信失敗: Panel ${selectedPanel} / ${slot.id} / ${label}`);
        return false;
      }

      setLastAction(`送信完了: Panel ${data.panel} / ${data.slot} / ${label}`);
      return true;
    } catch {
      playSound("entry_failed");
      setLastAction(`通信エラー: Panel ${selectedPanel} / ${slot.id} / ${label}`);
      return false;
    }
  }

  async function handleRevCutClick() {
    if (!slot.hasPosition) return;
    const next = !slot.revCutOn;
    setSlotToggle(selectedPanel, slot.id, "revCutOn", next);
    await sendPanelAction("REV CUT", "REV CUT", "revcut");
  }

  async function handleGuardClick() {
    if (!slot.hasPosition) return;
    const next = !slot.guardOn;
    setSlotToggle(selectedPanel, slot.id, "guardOn", next);
    const ok = await sendPanelAction(next ? "BE" : "BE_OFF", "GUARD", "guard");
    if (!ok) {
      setSlotToggle(selectedPanel, slot.id, "guardOn", !next);
    }
  }

  async function handleTp30Click() {
    if (!slot.hasPosition) return;
    const next = !slot.tp30On;
    setSlotToggle(selectedPanel, slot.id, "tp30On", next);
    const ok = await sendPanelAction(next ? "TP30" : "TP30_OFF", "TP+30", "tp30");
    if (!ok) {
      setSlotToggle(selectedPanel, slot.id, "tp30On", !next);
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#1e1e1e",
        color: "#ffffff",
        padding: "10px 8px 12px",
        fontFamily:
          'Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
      }}
    >
      <div style={{ maxWidth: 430, margin: "0 auto" }}>
        <div
          style={{
            background:
              tunnelStatus === "ok"
                ? "#16351f"
                : tunnelStatus === "ng"
                  ? "#4a1717"
                  : "#333333",
            border:
              tunnelStatus === "ok"
                ? "1px solid #2fbf71"
                : tunnelStatus === "ng"
                  ? "1px solid #e05a5a"
                  : "1px solid #555555",
            borderRadius: 10,
            padding: "5px 10px",
            marginBottom: 3,
            fontSize: 10,
            fontWeight: 800,
            textAlign: "center",
            color: "#ffffff",
          }}
        >
          CONNECTION:{" "}
          {tunnelStatus === "ok"
            ? "OK"
            : tunnelStatus === "ng"
              ? "NG"
              : "CHECKING"}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            marginBottom: 3,
          }}
        >
          <TopTab
            label="PANEL A"
            active={selectedPanel === "A"}
            onClick={() => selectPanel("A")}
          />
          <TopTab
            label="PANEL D"
            active={selectedPanel === "D"}
            onClick={() => selectPanel("D")}
          />
        </div>

        <div
          style={{
            background: "#2a2a2a",
            border: "1px solid #2b2b2b",
            borderRadius: 12,
            padding: "5px 10px",
            marginBottom: 5,
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          {panel.title} / {slot.id}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 6,
            marginBottom: 5,
          }}
        >
          {panel.slots.map((item) => (
            <MiniSelectButton
              key={item.id}
              label={item.symbol.replace("+", "")}
              active={selectedSlot === item.id}
              onClick={() => selectSlot(item.id)}
            />
          ))}
        </div>

        <div
          style={{
            background: "#2a2a2a",
            border: "1px solid #2b2b2b",
            borderRadius: 12,
            padding: 7,
          }}
        >
          <div
            style={{
              background: "#111111",
              border: "1px solid #444",
              borderRadius: 9,
              padding: 6,
              marginBottom: 5,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 6,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{slot.id}</div>
              <div
                style={{
                  minWidth: 108,
                  padding: "4px 8px",
                  background: "#111111",
                  border: "1px solid #444",
                  borderRadius: 7,
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {slot.symbol}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ opacity: 0.9, fontSize: 13 }}>Lot</div>
              <div
                style={{
                  minWidth: 58,
                  textAlign: "center",
                  padding: "4px 8px",
                  background: "#111111",
                  border: "1px solid #444",
                  borderRadius: 7,
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {slot.lot}
              </div>
            </div>
          </div>

          <InfoRow label="± pips" value={slot.pips || ""} />
          <InfoRow label="評価損益" value={slot.pl || ""} />
          <InfoRow label="1日獲得pips" value={slot.dayPips} />
          <InfoRow label="1日総損益" value={slot.dayPl} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 56px 1fr",
              gap: 6,
              marginBottom: 5,
            }}
          >
            <PriceButton
              side="SELL"
              price={slot.sellPrice}
              onClick={() => {
                void sendPanelAction("SELL", "SELL", "entry");
              }}
            />
            <SpreadBox spread={slot.spread} />
            <PriceButton
              side="BUY"
              price={slot.buyPrice}
              onClick={() => {
                void sendPanelAction("BUY", "BUY", "entry");
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              marginBottom: 5,
            }}
          >
            <ActionButton
              label="REV CUT"
              variant={slot.revCutOn ? "on" : "off"}
              disabled={!slot.hasPosition}
              onClick={() => {
                void handleRevCutClick();
              }}
            />
            <ActionButton
              label="GUARD"
              variant={slot.guardOn ? "on" : "off"}
              disabled={!slot.hasPosition}
              onClick={() => {
                void handleGuardClick();
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              marginBottom: 5,
            }}
          >
            <ActionButton
              label="TP+30"
              variant={slot.tp30On ? "on" : "tpOff"}
              disabled={!slot.hasPosition}
              onClick={() => {
                void handleTp30Click();
              }}
            />
            <ActionButton
              label="D-TEN"
              variant="dten"
              disabled={!slot.hasPosition}
              onClick={() => {
                void sendPanelAction("DTEN", "D-TEN", "dten");
              }}
            />
          </div>

          <ActionButton
            label="CLOSE"
            variant="close"
            fullWidth
            onClick={() => {
              void sendPanelAction("CLOSE", "CLOSE");
            }}
          />
        </div>

        <div
          style={{
            background: "#2a2a2a",
            border: "1px solid #2b2b2b",
            borderRadius: 10,
            padding: "9px 10px",
            marginTop: 6,
            fontSize: 12,
            fontWeight: 700,
            color: "#d1d5db",
          }}
        >
          LAST ACTION: {lastAction}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 6,
            marginTop: 6,
          }}
        >
          <MiniBottomButton
            label="再計算"
            onClick={() => {
              void sendPanelAction("RECALC", "再計算");
            }}
          />
        </div>
      </div>
    </main>
  );
}

function TopTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        height: 30,
        borderRadius: 12,
        border: "1px solid #444",
        background: active ? "#2d6cdf" : "#333333",
        color: "#fff",
        fontSize: 13,
        fontWeight: 800,
        WebkitTapHighlightColor: "transparent",
        ...getPressStyle(pressed, false),
      }}
    >
      {label}
    </button>
  );
}

function MiniSelectButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        height: 36,
        borderRadius: 10,
        border: "1px solid #444",
        background: active ? "#2563eb" : "#333333",
        color: "#fff",
        fontSize: 12,
        fontWeight: 800,
        padding: "0 4px",
        WebkitTapHighlightColor: "transparent",
        ...getPressStyle(pressed, false),
      }}
    >
      {label}
    </button>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const positive = trimmed.startsWith("+");

  return (
    <div
      style={{
        background: "#1f1f1f",
        border: "1px solid #444",
        borderRadius: 9,
        padding: "8px 10px",
        marginBottom: 5,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 8,
        alignItems: "center",
      }}
    >
      <div style={{ opacity: 0.8, fontSize: 13 }}>{label}</div>
      <div
        style={{
          textAlign: "right",
          fontSize: 18,
          fontWeight: 800,
          color: positive ? "#A8D8FF" : negative ? "#FFB0B0" : "#ffffff",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PriceButton({
  side,
  price,
  onClick,
}: {
  side: "SELL" | "BUY";
  price: string;
  onClick: () => void;
}) {
  const isSell = side === "SELL";
  const { main, last } = splitPriceForDisplay(price);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        height: 84,
        borderRadius: 16,
        border: "none",
        background: isSell ? "#D94141" : "#2D6CDF",
        color: "#fff",
        padding: 8,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "stretch",
        WebkitTapHighlightColor: "transparent",
        ...getPressStyle(pressed, false),
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, textAlign: "left", opacity: 0.95 }}>
        {side}
      </div>

      <div
        style={{
          textAlign: "right",
          lineHeight: 1,
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontSize: 32,
            lineHeight: 1,
          }}
        >
          {main}
        </span>
        <span
          style={{
            fontSize: 16,
            lineHeight: 1,
            position: "relative",
            top: -10,
            marginLeft: 1,
            display: "inline-block",
          }}
        >
          {last}
        </span>
      </div>
    </button>
  );
}

function SpreadBox({ spread }: { spread: string }) {
  return (
    <div
      style={{
        height: 42,
        alignSelf: "center",
        borderRadius: 10,
        border: "1px solid #444",
        background: "#111111",
        padding: 5,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: 10, opacity: 0.8, lineHeight: 1 }}>SPR</div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "gold",
          lineHeight: 1.1,
          marginTop: 1,
        }}
      >
        {spread}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  variant,
  disabled = false,
  fullWidth = false,
  onClick,
}: {
  label: string;
  variant: "off" | "on" | "tpOff" | "dten" | "close";
  disabled?: boolean;
  fullWidth?: boolean;
  onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  let background = "#3A3A3A";
  let color = "#ffffff";

  if (variant === "on") {
    background = "#D94141";
    color = "#ffffff";
  } else if (variant === "tpOff") {
    background = "#9AC932";
    color = "#111111";
  } else if (variant === "dten") {
    background = "#8B5CD6";
    color = "#ffffff";
  } else if (variant === "close") {
    background = "#D4AF37";
    color = "#111111";
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        width: fullWidth ? "100%" : undefined,
        height: variant === "close" ? 50 : 42,
        borderRadius: 18,
        border: "none",
        background,
        color: disabled ? "rgba(255,255,255,0.35)" : color,
        fontSize: variant === "close" ? 18 : 14,
        fontWeight: 800,
        WebkitTapHighlightColor: "transparent",
        ...getPressStyle(pressed, disabled),
      }}
    >
      {label}
    </button>
  );
}

function MiniBottomButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        height: 36,
        borderRadius: 12,
        border: "1px solid #444",
        background: "#333333",
        color: "#ffffff",
        fontSize: 11,
        fontWeight: 800,
        WebkitTapHighlightColor: "transparent",
        ...getPressStyle(pressed, false),
      }}
    >
      {label}
    </button>
  );
}