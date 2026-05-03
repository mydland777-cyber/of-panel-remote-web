"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PanelKey = "A";
type SlotKey = "S1" | "S2" | "S3" | "S4";
type TunnelStatus = "checking" | "ok" | "ng";

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
  entryPrice: string;
  entryTime: string;
  entryEpochMs: number | null;
  elapsedSeconds: number | null;
  hasPosition: boolean;
  guardOn: boolean;
  revCutOn: boolean;
  tp30On: boolean;
  tbuyOn: boolean;
  tsellOn: boolean;
};

type PanelData = {
  title: string;
  slots: SlotData[];
};

type BridgeStateSlot = {
  [key: string]: unknown;
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
  panel_lot?: number;
  guard_on?: boolean;
  revcut_on?: boolean;
  tp30_on?: boolean;
  tbuy_on?: boolean;
  tsell_on?: boolean;
};

type BridgeStateResponse = {
  ok: boolean;
  panel: PanelKey;
  now: string;
  slots: BridgeStateSlot[];
};

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
      entryPrice: "—",
      entryTime: "—",
      entryEpochMs: null,
      elapsedSeconds: null,
      hasPosition: false,
      guardOn: false,
      revCutOn: false,
      tp30On: false,
      tbuyOn: false,
      tsellOn: false,
    })),
  };
}

const INITIAL_PANEL_DATA: Record<PanelKey, PanelData> = {
  A: createEmptyPanelData("A"),
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

function normalizeLotValue(value: number) {
  let lots = clamp(value, 0.01, 300.0);
  lots = roundToStepFloor(lots, 0.01);

  if (lots < 0.01) lots = 0.01;

  return Number(lots.toFixed(2));
}

function parseLotInput(value: string) {
  const normalized = value.trim().replace(",", ".");
  const num = Number(normalized);

  if (!Number.isFinite(num)) return null;

  return normalizeLotValue(num);
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

function toFiniteNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function pickNumberField(item: BridgeStateSlot, names: string[]) {
  for (const name of names) {
    const num = toFiniteNumber(item[name]);
    if (num !== null) return num;
  }
  return null;
}

function pickStringField(item: BridgeStateSlot, names: string[]) {
  for (const name of names) {
    const value = item[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeEpochMs(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  const num = toFiniteNumber(value);
  if (num === null || num <= 0) return null;

  if (num > 1000000000000) return num;
  if (num > 1000000000) return num * 1000;

  return null;
}

function formatClockFromEpochMs(epochMs: number | null) {
  if (!epochMs) return "—";

  const date = new Date(epochMs);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");

  return `${hh}:${mm}`;
}

function formatElapsedSeconds(totalSeconds: number | null) {
  if (totalSeconds === null || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "--:--";
  }

  const seconds = Math.floor(totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
}

function getEntryEpochMs(item: BridgeStateSlot) {
  const fieldNames = [
    "entry_time",
    "entryTime",
    "open_time",
    "openTime",
    "pos_time",
    "posTime",
    "position_time",
    "positionTime",
    "entry_ts",
    "entryTs",
    "open_ts",
    "openTs",
    "pos_ts",
    "posTs",
    "position_ts",
    "positionTs",
  ];

  for (const name of fieldNames) {
    const epochMs = normalizeEpochMs(item[name]);
    if (epochMs) return epochMs;
  }

  return null;
}

function getEntryTimeText(item: BridgeStateSlot, entryEpochMs: number | null) {
  const text = pickStringField(item, [
    "entry_time_text",
    "entryTimeText",
    "entry_time",
    "entryTime",
    "open_time_text",
    "openTimeText",
    "open_time",
    "openTime",
  ]);

  const timeMatch = text.match(/(\d{1,2}:\d{2})(?::\d{2})?/);
  if (timeMatch) return timeMatch[1].padStart(5, "0");

  return formatClockFromEpochMs(entryEpochMs);
}

function getEntryPriceText(item: BridgeStateSlot, digits?: number | null) {
  const price = pickNumberField(item, [
    "entry_price",
    "entryPrice",
    "open_price",
    "openPrice",
    "pos_price",
    "posPrice",
    "position_price",
    "positionPrice",
    "order_open_price",
    "orderOpenPrice",
  ]);

  if (price === null || price <= 0) return "—";
  return formatPrice(price, digits);
}

function getElapsedSeconds(item: BridgeStateSlot, entryEpochMs: number | null) {
  if (entryEpochMs) {
    return Math.max(0, Math.floor((Date.now() - entryEpochMs) / 1000));
  }

  const elapsed = pickNumberField(item, [
    "elapsed_seconds",
    "elapsedSeconds",
    "position_elapsed_seconds",
    "positionElapsedSeconds",
    "pos_elapsed_seconds",
    "posElapsedSeconds",
  ]);

  if (elapsed === null) return null;
  return Math.max(0, Math.floor(elapsed));
}

function getDisplayElapsedSeconds(slot: SlotData, nowMs: number) {
  if (!slot.hasPosition) return null;

  if (slot.entryEpochMs) {
    return Math.max(0, Math.floor((nowMs - slot.entryEpochMs) / 1000));
  }

  return slot.elapsedSeconds;
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
  response: BridgeStateResponse
): PanelData {
  const totalPips = response.slots.reduce((sum, item) => {
    if (!item?.ok) return sum;
    return sum + Number(item.pips ?? 0);
  }, 0);

  const totalProfit = response.slots.reduce((sum, item) => {
    if (!item?.ok) return sum;
    return sum + Number(item.pl ?? 0);
  }, 0);

  const totalDayPips = response.slots.reduce((sum, item) => {
    if (!item?.ok) return sum;
    return sum + Number(item.day_pips ?? 0);
  }, 0);

  const totalDayProfit = response.slots.reduce((sum, item) => {
    if (!item?.ok) return sum;
    return sum + Number(item.day_profit ?? 0);
  }, 0);

  const mappedSlots: SlotData[] = (["S1", "S2", "S3", "S4"] as SlotKey[]).map((slotId) => {
    const item = response.slots.find((s) => s.slot === slotId);

    if (!item || !item.ok) {
      return {
        id: slotId,
        symbol: SLOT_SYMBOLS[slotId],
        lot: "0.01",
        pips: formatSignedNumber(totalPips, 1),
        pl: formatMoney(totalProfit),
        dayPips: formatSignedNumber(totalDayPips, 1),
        dayPl: formatMoney(totalDayProfit),
        buyPrice: "0",
        spread: "0",
        sellPrice: "0",
        entryPrice: "—",
        entryTime: "—",
        entryEpochMs: null,
        elapsedSeconds: null,
        hasPosition: false,
        guardOn: false,
        revCutOn: false,
        tp30On: false,
        tbuyOn: false,
        tsellOn: false,
      };
    }

    const posLots = Number(item.pos_lots ?? 0);
    const posDir = Number(item.pos_dir ?? 0);
    const digits = item.digits ?? null;
    const hasPosition = response.slots.some(
      (s) => s?.ok && Number(s.pos_dir ?? 0) !== 0 && Number(s.pos_lots ?? 0) > 0
    );
    const entryEpochMs = hasPosition ? getEntryEpochMs(item) : null;
    const entryPrice = hasPosition ? getEntryPriceText(item, digits) : "—";
    const entryTime = hasPosition ? getEntryTimeText(item, entryEpochMs) : "—";
    const elapsedSeconds = hasPosition ? getElapsedSeconds(item, entryEpochMs) : null;

    return {
      id: slotId,
      symbol: item.symbol || SLOT_SYMBOLS[slotId],
      lot:
        typeof item.panel_lot === "number" && Number.isFinite(item.panel_lot) && item.panel_lot > 0
          ? formatLot(item.panel_lot)
          : calcDisplayedLotFromState(item),
      pips: formatSignedNumber(totalPips, 1),
      pl: formatMoney(totalProfit),
      dayPips: formatSignedNumber(totalDayPips, 1),
      dayPl: formatMoney(totalDayProfit),
      buyPrice: formatPrice(Number(item.ask ?? 0), digits),
      spread: formatSpread(Number(item.spread ?? 0)),
      sellPrice: formatPrice(Number(item.bid ?? 0), digits),
      entryPrice,
      entryTime,
      entryEpochMs,
      elapsedSeconds,
      hasPosition,
      guardOn: Boolean(item.guard_on),
      revCutOn: Boolean(item.revcut_on),
      tp30On: Boolean(item.tp30_on),
      tbuyOn: Boolean(item.tbuy_on),
      tsellOn: Boolean(item.tsell_on),
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
  const selectedPanel: PanelKey = "A";
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>("S1");
  const [lastAction, setLastAction] = useState("未操作");
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus>("checking");
  const [panelDataMap, setPanelDataMap] = useState<Record<PanelKey, PanelData>>(INITIAL_PANEL_DATA);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lotEditorOpen, setLotEditorOpen] = useState(false);
  const [lotEditorValue, setLotEditorValue] = useState("0.01");

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

  const slotElapsed = formatElapsedSeconds(getDisplayElapsedSeconds(slot, nowMs));
  const openLotEditor = () => {
    setLotEditorValue(slot.lot || "0.01");
    setLotEditorOpen(true);
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

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

        setPanelDataMap((prev) => ({
          ...prev,
          [selectedPanel]: mapBridgeStateToPanelData(selectedPanel, data),
        }));

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

  function selectSlot(slotId: SlotKey) {
    setSelectedSlot(slotId);
    setLastAction(`Panel ${selectedPanel} / ${slotId} を選択`);
  }

  async function sendPanelAction(
    action: string,
    label: string,
    sound?: keyof typeof audioRef.current,
    targetSlot?: SlotKey
  ) {
    const sendSlot = targetSlot ?? slot.id;

    setLastAction(`送信中: Panel ${selectedPanel} / ${sendSlot} / ${label}`);

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
          slot: sendSlot,
          action,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        playSound("entry_failed");
        setLastAction(`送信失敗: Panel ${selectedPanel} / ${sendSlot} / ${label}`);
        return false;
      }

      const refreshBridgeState = async () => {
        const bridgeRes = await fetch(`/api/bridge-state?panel=${selectedPanel}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!bridgeRes.ok) return false;

        const bridgeData = (await bridgeRes.json()) as BridgeStateResponse;

        if (!bridgeData?.ok || !Array.isArray(bridgeData.slots)) return false;

        setPanelDataMap((prev) => ({
          ...prev,
          [selectedPanel]: mapBridgeStateToPanelData(selectedPanel, bridgeData),
        }));

        setTunnelStatus("ok");
        return true;
      };

      try {
        if (action === "CLOSE" || action === "RECALC") {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await refreshBridgeState();
          await new Promise((resolve) => setTimeout(resolve, 700));
          await refreshBridgeState();
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await refreshBridgeState();
        } else {
          await refreshBridgeState();
        }
      } catch {
        // 失敗時は通常ポーリングに任せる
      }

      setLastAction(`送信完了: Panel ${data.panel} / ${data.slot} / ${label}`);
      return true;
    } catch {
      playSound("entry_failed");
      setLastAction(`通信エラー: Panel ${selectedPanel} / ${sendSlot} / ${label}`);
      return false;
    }
  }

  async function handleRevCutClick() {
    if (!slot.hasPosition) return;
    await sendPanelAction("REV CUT", "REV CUT", "revcut");
  }

  async function handleGuardClick() {
    if (!slot.hasPosition) return;
    await sendPanelAction(slot.guardOn ? "BE_OFF" : "BE", "GUARD", "guard");
  }

  async function handleTp30Click() {
    if (!slot.hasPosition) return;
    await sendPanelAction(slot.tp30On ? "TP30_OFF" : "TP30", "TP+30", "tp30");
  }

  const applyManualLot = async () => {
    const nextLot = parseLotInput(lotEditorValue);

    if (nextLot == null) {
      return;
    }

    const lotText = formatLot(nextLot);

    setLotEditorValue(lotText);
    setLotEditorOpen(false);

    await sendPanelAction(
      `LOT_SYNC_ALL:${lotText}`,
      "LOT",
      undefined,
      "S1"
    );
  };

  const adjustLotEditorValue = (delta: number) => {
    const current = parseLotInput(lotEditorValue) ?? parseLotInput(slot.lot) ?? 0.01;
    const next = normalizeLotValue(current + delta);

    setLotEditorValue(formatLot(next));
  };

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
            background: "#171717",
            border: "1px solid #333333",
            borderRadius: 8,
            padding: "3px 8px",
            marginBottom: 4,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
            alignItems: "center",
            fontSize: 12,
            lineHeight: 1.1,
            fontWeight: 800,
            color: slot.hasPosition ? "#ffffff" : "#8b8b8b",
          }}
        >
          <div style={{ textAlign: "left" }}>{slot.entryPrice}</div>
          <div style={{ textAlign: "center" }}>{slot.entryTime}</div>
          <div style={{ textAlign: "right" }}>[{slotElapsed}]</div>
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
              <button
                type="button"
                onClick={openLotEditor}
                style={{
                  minWidth: 58,
                  textAlign: "center",
                  padding: "4px 8px",
                  background: "#111111",
                  color: "#ffffff",
                  border: "1px solid #666",
                  borderRadius: 7,
                  fontWeight: 800,
                  fontSize: 15,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {slot.lot}
              </button>
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
              label="T SELL"
              variant={slot.tsellOn ? "on" : "tSell"}
              disabled={slot.hasPosition}
              onClick={() => {
                void sendPanelAction("T SELL", "T SELL");
              }}
            />
            <ActionButton
              label="T BUY"
              variant={slot.tbuyOn ? "on" : "tBuy"}
              disabled={slot.hasPosition}
              onClick={() => {
                void sendPanelAction("T BUY", "T BUY");
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
              setLotEditorOpen(false);
              setLotEditorValue("0.01");
              void sendPanelAction("RECALC", "再計算");
            }}
          />
        </div>
      </div>

      {lotEditorOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.65)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(360px, 100%)",
              background: "#242424",
              border: "1px solid #555",
              borderRadius: 14,
              padding: 14,
              boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 900,
                marginBottom: 10,
              }}
            >
              Lot編集 / {slot.id}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <MiniBottomButton label="-10" onClick={() => adjustLotEditorValue(-10)} />
              <MiniBottomButton label="-1" onClick={() => adjustLotEditorValue(-1)} />
              <MiniBottomButton label="-0.1" onClick={() => adjustLotEditorValue(-0.1)} />
            </div>

            <input
              value={lotEditorValue}
              inputMode="decimal"
              onChange={(e) => setLotEditorValue(e.target.value)}
              style={{
                width: "100%",
                height: 46,
                boxSizing: "border-box",
                textAlign: "center",
                background: "#111",
                color: "#fff",
                border: "1px solid #666",
                borderRadius: 10,
                fontSize: 24,
                fontWeight: 900,
                marginBottom: 8,
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <MiniBottomButton label="+10" onClick={() => adjustLotEditorValue(10)} />
              <MiniBottomButton label="+1" onClick={() => adjustLotEditorValue(1)} />
              <MiniBottomButton label="+0.1" onClick={() => adjustLotEditorValue(0.1)} />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              <MiniBottomButton
                label="閉じる"
                onClick={() => {
                  setLotEditorOpen(false);
                }}
              />
              <MiniBottomButton
                label="1/2"
                onClick={() => {
                  const current = parseLotInput(lotEditorValue) ?? parseLotInput(slot.lot) ?? 0.01;
                  const next = normalizeLotValue(current / 2);
                  setLotEditorValue(formatLot(next));
                }}
              />
              <MiniBottomButton
                label="反映"
                onClick={() => {
                  void applyManualLot();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </main>
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
  variant: "off" | "on" | "tpOff" | "dten" | "close" | "tSell" | "tBuy";
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
  } else if (variant === "tSell") {
    background = "#9B4A7A";
    color = "#ffffff";
  } else if (variant === "tBuy") {
    background = "#2F8F7B";
    color = "#ffffff";
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