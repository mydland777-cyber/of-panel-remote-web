"use client";

import { useMemo, useState } from "react";

type PanelKey = "A" | "D";
type SlotKey = "S1" | "S2" | "S3" | "S4";

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

const PANEL_DATA: Record<PanelKey, PanelData> = {
  A: {
    title: "[A] O&F Trade Panel",
    slots: [
      {
        id: "S1",
        symbol: "USDJPY+",
        lot: "0.20",
        pips: "+5.8",
        pl: "+12,450",
        dayPips: "+22.4",
        dayPl: "+48,200",
        buyPrice: "143.289",
        spread: "0.2",
        sellPrice: "143.287",
        hasPosition: true,
        guardOn: true,
      },
      {
        id: "S2",
        symbol: "EURJPY+",
        lot: "0.20",
        pips: "",
        pl: "",
        dayPips: "+22.4",
        dayPl: "+48,200",
        buyPrice: "161.842",
        spread: "0.3",
        sellPrice: "161.839",
        hasPosition: false,
      },
      {
        id: "S3",
        symbol: "EURAUD+",
        lot: "0.20",
        pips: "-1.4",
        pl: "-2,980",
        dayPips: "+22.4",
        dayPl: "+48,200",
        buyPrice: "1.68219",
        spread: "0.4",
        sellPrice: "1.68179",
        hasPosition: true,
        revCutOn: true,
      },
      {
        id: "S4",
        symbol: "GBPAUD+",
        lot: "0.20",
        pips: "",
        pl: "",
        dayPips: "+22.4",
        dayPl: "+48,200",
        buyPrice: "1.94462",
        spread: "0.5",
        sellPrice: "1.94412",
        hasPosition: false,
      },
    ],
  },
  D: {
    title: "[D] O&F Trade Panel",
    slots: [
      {
        id: "S1",
        symbol: "USDJPY+",
        lot: "0.20",
        pips: "+2.1",
        pl: "+4,320",
        dayPips: "+9.1",
        dayPl: "+18,800",
        buyPrice: "143.301",
        spread: "0.2",
        sellPrice: "143.299",
        hasPosition: true,
      },
      {
        id: "S2",
        symbol: "EURJPY+",
        lot: "0.20",
        pips: "",
        pl: "",
        dayPips: "+9.1",
        dayPl: "+18,800",
        buyPrice: "161.855",
        spread: "0.3",
        sellPrice: "161.852",
        hasPosition: false,
      },
      {
        id: "S3",
        symbol: "EURAUD+",
        lot: "0.20",
        pips: "",
        pl: "",
        dayPips: "+9.1",
        dayPl: "+18,800",
        buyPrice: "1.68254",
        spread: "0.4",
        sellPrice: "1.68214",
        hasPosition: false,
      },
      {
        id: "S4",
        symbol: "GBPAUD+",
        lot: "0.20",
        pips: "-0.8",
        pl: "-1,650",
        dayPips: "+9.1",
        dayPl: "+18,800",
        buyPrice: "1.94488",
        spread: "0.5",
        sellPrice: "1.94438",
        hasPosition: true,
        tp30On: true,
      },
    ],
  },
};

export default function Home() {
  const [selectedPanel, setSelectedPanel] = useState<PanelKey>("A");
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>("S1");
  const [lastAction, setLastAction] = useState("未操作");

  const panel = useMemo(() => PANEL_DATA[selectedPanel], [selectedPanel]);
  const slot = useMemo(() => {
    return panel.slots.find((item) => item.id === selectedSlot) ?? panel.slots[0];
  }, [panel, selectedSlot]);

  function selectPanel(panelKey: PanelKey) {
    setSelectedPanel(panelKey);
    setSelectedSlot("S1");
    setLastAction(`Panel ${panelKey} を選択`);
  }

  function selectSlot(slotId: SlotKey) {
    setSelectedSlot(slotId);
    setLastAction(`Panel ${selectedPanel} / ${slotId} を選択`);
  }

  function handleAction(action: string) {
    setLastAction(`Panel ${selectedPanel} / ${slot.id} / ${action}`);
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
              onClick={() => handleAction("SELL")}
            />
            <SpreadBox spread={slot.spread} />
            <PriceButton
              side="BUY"
              price={slot.buyPrice}
              onClick={() => handleAction("BUY")}
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
              onClick={() => handleAction("REV CUT")}
            />
            <ActionButton
              label="GUARD"
              onState={slot.guardOn}
              disabled={!slot.hasPosition}
              purple
              onClick={() => handleAction("GUARD")}
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
              onClick={() => handleAction("TP+30")}
            />
            <ActionButton
              label="D-TEN"
              disabled={!slot.hasPosition}
              purple
              onClick={() => handleAction("D-TEN")}
            />
          </div>

          <ActionButton
            label="CLOSE"
            close
            fullWidth
            onClick={() => handleAction("CLOSE")}
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
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
            marginTop: 5,
          }}
        >
          <MiniBottomButton label="再計算" onClick={() => handleAction("再計算")} />
          <MiniBottomButton label="LINK" onClick={() => handleAction("LINK")} />
          <MiniBottomButton label="LOG" onClick={() => handleAction("LOG")} />
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
  const negative = value.trim().startsWith("-");
  const positive = value.trim().startsWith("+");

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