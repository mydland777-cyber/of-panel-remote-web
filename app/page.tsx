"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PanelKey = "A" | "D";
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
  hasPosition: boolean;
  guardOn?: boolean;
  revCutOn?: boolean;
  tp30On?: boolean;
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

function mapBridgeStateToPanelData(panel: PanelKey, response: BridgeStateResponse): PanelData {
  const mappedSlots: SlotData[] = (["S1", "S2", "S3", "S4"] as SlotKey[]).map((slotId) => {
    const item = response.slots.find((s) => s.slot === slotId);

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
      hasPosition: posDir !== 0 && posLots > 0,
      guardOn: false,
      revCutOn: false,
      tp30On: false,
    };
  });

  return {
    title: `[${panel}] O&F Trade Panel`,
    slots: mappedSlots,
  };
}

export default function Home() {
  const [selectedPanel, setSelectedPanel] = useState<PanelKey>("A");
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>("S1");
  const [lastAction, setLastAction] = useState("未操作");
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus>("checking");
  const [panelDataMap, setPanelDataMap] = useState<Record<PanelKey, PanelData>>(INITIAL_PANEL_DATA);

  const audioRef = useRef<Record<string, HTMLAudioElement | null>>({
    entry: null,
    entry_failed: null,
    guard: null,
    revcut: null,
    tp30: null,
    dten: null,
  });

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
      }
    });
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
      cloned.currentTime = 0;
      void cloned.play().catch(() => {});
    } catch {
      // ignore
    }
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
        return;
      }

      setLastAction(`送信完了: Panel ${data.panel} / ${data.slot} / ${label}`);
    } catch {
      playSound("entry_failed");
      setLastAction(`通信エラー: Panel ${selectedPanel} / ${slot.id} / ${label}`);
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#1e1e1e",
        color: "#ffffff",
        padding: "8px 8px 8px",
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
            padding: "6px 10px",
            marginBottom: 5,
            fontSize: 12,
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
            marginBottom: 5,
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
            padding: "7px 10px",
            marginBottom: 5,
            fontSize: 15,
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
                  padding: "4px 7px",
                  background: "#111111",
                  border: "1px solid #444",
                  borderRadius: 7,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {slot.symbol}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ opacity: 0.9, fontSize: 13 }}>Lot</div>
              <div
                style={{
                  minWidth: 54,
                  textAlign: "center",
                  padding: "4px 7px",
                  background: "#111111",
                  border: "1px solid #444",
                  borderRadius: 7,
                  fontWeight: 700,
                  fontSize: 14,
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
              gridTemplateColumns: "1fr 52px 1fr",
              gap: 6,
              marginBottom: 5,
            }}
          >
            <PriceButton
              side="SELL"
              price={slot.sellPrice}
              onClick={() => sendPanelAction("SELL", "SELL", "entry")}
            />
            <SpreadBox spread={slot.spread} />
            <PriceButton
              side="BUY"
              price={slot.buyPrice}
              onClick={() => sendPanelAction("BUY", "BUY", "entry")}
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
              onState={slot.revCutOn}
              disabled={!slot.hasPosition}
              onClick={() => sendPanelAction("REV CUT", "REV CUT", "revcut")}
            />
            <ActionButton
              label="GUARD"
              onState={slot.guardOn}
              disabled={!slot.hasPosition}
              purple
              onClick={() => sendPanelAction("BE", "GUARD", "guard")}
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
              onState={slot.tp30On}
              disabled={!slot.hasPosition}
              gold
              onClick={() => sendPanelAction("TP30", "TP+30", "tp30")}
            />
            <ActionButton
              label="D-TEN"
              disabled={!slot.hasPosition}
              purple
              onClick={() => sendPanelAction("DTEN", "D-TEN", "dten")}
            />
          </div>

          <ActionButton
            label="CLOSE"
            close
            fullWidth
            onClick={() => sendPanelAction("CLOSE", "CLOSE")}
          />
        </div>

        <div
          style={{
            background: "#2a2a2a",
            border: "1px solid #2b2b2b",
            borderRadius: 10,
            padding: "7px 10px",
            marginTop: 5,
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
            marginTop: 5,
          }}
        >
          <MiniBottomButton
            label="再計算"
            onClick={() => sendPanelAction("RECALC", "再計算")}
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
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 36,
        borderRadius: 12,
        border: "1px solid #444",
        background: active ? "#2d6cdf" : "#333333",
        color: "#fff",
        fontSize: 14,
        fontWeight: 800,
        WebkitTapHighlightColor: "transparent",
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
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32,
        borderRadius: 10,
        border: "1px solid #444",
        background: active ? "#2563eb" : "#333333",
        color: "#fff",
        fontSize: 11,
        fontWeight: 800,
        padding: "0 4px",
        WebkitTapHighlightColor: "transparent",
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
        padding: "6px 9px",
        marginBottom: 5,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 8,
        alignItems: "center",
      }}
    >
      <div style={{ opacity: 0.8, fontSize: 12 }}>{label}</div>
      <div
        style={{
          textAlign: "right",
          fontSize: 17,
          fontWeight: 800,
          color: positive ? "#a8d8ff" : negative ? "#ffb0b0" : "#ffffff",
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

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 70,
        borderRadius: 16,
        border: "none",
        background: isSell ? "#d94141" : "#2d6cdf",
        color: "#fff",
        padding: 7,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "stretch",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 800, textAlign: "left" }}>
        {side}
      </div>
      <div
        style={{
          fontSize: 21,
          fontWeight: 800,
          textAlign: "right",
          lineHeight: 1,
        }}
      >
        {price}
      </div>
    </button>
  );
}

function SpreadBox({ spread }: { spread: string }) {
  return (
    <div
      style={{
        height: 36,
        alignSelf: "center",
        borderRadius: 9,
        border: "1px solid #444",
        background: "#111111",
        padding: 4,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: 9, opacity: 0.8, lineHeight: 1 }}>SPR</div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "gold",
          lineHeight: 1.1,
        }}
      >
        {spread}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  disabled = false,
  onState = false,
  purple = false,
  gold = false,
  close = false,
  fullWidth = false,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onState?: boolean;
  purple?: boolean;
  gold?: boolean;
  close?: boolean;
  fullWidth?: boolean;
  onClick: () => void;
}) {
  let background = "#3a3a3a";
  let color = "#ffffff";

  if (close) {
    background = "#d4af37";
    color = "#111111";
  } else if (onState) {
    background = "#d94141";
  } else if (purple) {
    background = "#7e6bd6";
  } else if (gold) {
    background = "#e6dca7";
    color = "#1a1a1a";
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: fullWidth ? "100%" : undefined,
        height: close ? 44 : 38,
        borderRadius: 16,
        border: "none",
        background,
        color: disabled ? "rgba(255,255,255,0.35)" : color,
        fontSize: close ? 18 : 14,
        fontWeight: 800,
        opacity: disabled ? 0.35 : 1,
        WebkitTapHighlightColor: "transparent",
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
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32,
        borderRadius: 12,
        border: "1px solid #444",
        background: "#333333",
        color: "#ffffff",
        fontSize: 11,
        fontWeight: 800,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {label}
    </button>
  );
}