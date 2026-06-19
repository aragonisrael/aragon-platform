import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import aragonLogo from '../../assets/aragonlogo.png';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import ManagementBottomNav from '../../components/navigation/ManagementBottomNav';

export const managementMobileStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap');
  @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

  .mgmt-mobile-root {
    min-height: 100vh;
    min-height: 100dvh;
    width: 100%;
    background: #050a14;
    display: flex;
    justify-content: center;
    align-items: stretch;
  }

  .mgmt-mobile-app {
    width: 100%;
    max-width: 430px;
    min-height: 100vh;
    min-height: 100dvh;
    background: #05010f;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font-family: 'Heebo', sans-serif;
    color: #e8eeff;
    direction: rtl;
    box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.15);
  }

  @media (min-width: 520px) {
    .mgmt-mobile-root { padding: 16px 0; align-items: center; }
    .mgmt-mobile-app {
      min-height: 780px;
      height: min(92vh, 860px);
      border-radius: 28px;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(124, 58, 237, 0.25);
    }
  }

  .mgmt-stars { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
  .mgmt-star {
    position: absolute; border-radius: 50%; background: white;
    animation: mgmtTwinkle var(--d, 2s) ease-in-out infinite alternate;
  }
  @keyframes mgmtTwinkle { from { opacity: 0.08; } to { opacity: 0.75; } }

  .mgmt-grid-bg {
    position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.04;
    background-image: linear-gradient(rgba(0,200,255,0.5) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,200,255,0.5) 1px, transparent 1px);
    background-size: 36px 36px;
  }

  .mgmt-ambient {
    position: absolute; border-radius: 50%; pointer-events: none; z-index: 1;
    filter: blur(70px); opacity: 0.38;
  }
  .mgmt-ambient-1 { width: 220px; height: 220px; top: 18%; right: -50px; background: #6366f1; }
  .mgmt-ambient-2 { width: 180px; height: 180px; bottom: 28%; left: -40px; background: #2dd4bf; opacity: 0.28; }
  .mgmt-ambient-3 { width: 140px; height: 140px; bottom: 12%; right: 10%; background: #a855f7; opacity: 0.22; }

  /* מרווח עליון לשעה / סוללה / אות של המכשיר */
  .mgmt-status-gap {
    flex-shrink: 0;
    width: 100%;
    height: max(env(safe-area-inset-top, 0px), 44px);
    min-height: 44px;
    position: relative;
    z-index: 10;
  }

  .mgmt-top-banner {
    position: relative; z-index: 10; flex-shrink: 0;
    background: transparent;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding: 4px 16px 12px;
  }

  .mgmt-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .mgmt-header-text {
    flex: 1;
    min-width: 0;
    text-align: right;
  }

  .mgmt-welcome {
    font-size: 15px;
    font-weight: 800;
    color: #e8eeff;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mgmt-welcome span { color: #00c8ff; }

  .mgmt-page-label {
    font-family: 'Heebo', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: rgba(160, 185, 215, 0.65);
    margin-top: 2px;
  }

  .mgmt-logo-wrap {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.92);
    padding: 2px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.35);
  }

  .mgmt-logo-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    display: block;
  }

  .mgmt-scroll-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    z-index: 5;
    padding: 12px 16px 8px;
    -webkit-overflow-scrolling: touch;
  }

  .mgmt-bottom-dock {
    flex-shrink: 0;
    z-index: 60;
    padding: 0 14px calc(10px + env(safe-area-inset-bottom, 0));
    background: linear-gradient(to top, #05010f 75%, rgba(5, 1, 15, 0));
  }

  .mgmt-modal-root {
    position: absolute;
    inset: 0;
    z-index: 200;
    pointer-events: none;
    overflow: hidden;
    border-radius: inherit;
  }

  .mgmt-modal-root > * {
    pointer-events: auto;
  }

  .mgmt-fab-slot {
    padding-bottom: 10px;
  }

  .mgmt-fab {
    width: 100%;
    padding: 13px 18px;
    border-radius: 999px;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.32);
    font-family: 'Heebo', sans-serif;
    font-size: 14px;
    font-weight: 800;
    color: #fff;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.55) 0%, rgba(139, 92, 246, 0.6) 45%, rgba(168, 85, 247, 0.55) 100%);
    backdrop-filter: blur(24px) saturate(1.6);
    -webkit-backdrop-filter: blur(24px) saturate(1.6);
    box-shadow:
      0 10px 28px rgba(99, 102, 241, 0.35),
      inset 0 1px 1px rgba(255, 255, 255, 0.45),
      inset 0 -1px 1px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: transform 0.15s ease, box-shadow 0.2s ease;
  }
  .mgmt-fab:active { transform: scale(0.98); }

  .mgmt-liquid-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    padding: 5px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(40px) saturate(1.85);
    -webkit-backdrop-filter: blur(40px) saturate(1.85);
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 999px;
    box-shadow:
      0 12px 40px rgba(0, 0, 0, 0.22),
      inset 0 1px 1px rgba(255, 255, 255, 0.38),
      inset 0 -1px 1px rgba(255, 255, 255, 0.06);
  }

  .mgmt-liquid-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 4px 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 999px;
    transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .mgmt-liquid-tab .tab-icon-wrap {
    width: 36px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    transition: all 0.28s ease;
    pointer-events: none;
  }

  .mgmt-liquid-tab i { font-size: 19px; color: rgba(255, 255, 255, 0.55); pointer-events: none; }
  .mgmt-liquid-tab span {
    font-family: 'Heebo', sans-serif;
    font-size: 9.5px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    pointer-events: none;
  }

  .mgmt-liquid-tab.active {
    background: rgba(255, 255, 255, 0.88);
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.95);
  }
  .mgmt-liquid-tab.active i { color: #6366f1; }
  .mgmt-liquid-tab.active span { color: #4338ca; font-weight: 800; }

  .mgmt-section-title {
    font-family: 'Heebo', sans-serif;
    font-size: 17px;
    font-weight: 800;
    color: #f0f4ff;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mgmt-section-sub {
    font-size: 12px;
    font-weight: 600;
    color: rgba(160, 185, 215, 0.55);
  }

  .mgmt-filter-row {
    display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 14px;
    -webkit-overflow-scrolling: touch; scrollbar-width: none;
  }
  .mgmt-filter-row::-webkit-scrollbar { display: none; }

  .mgmt-filter-chip {
    flex-shrink: 0; padding: 8px 14px; border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.07);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    color: rgba(255, 255, 255, 0.55); font-size: 12px; font-weight: 700; cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
    transition: all 0.2s;
  }
  .mgmt-filter-chip.active {
    border-color: rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .mgmt-task-card {
    position: relative;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.09);
    backdrop-filter: blur(32px) saturate(1.6);
    -webkit-backdrop-filter: blur(32px) saturate(1.6);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 20px;
    padding: 14px 16px;
    margin-bottom: 10px;
    cursor: pointer;
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.12),
      inset 0 1px 1px rgba(255, 255, 255, 0.22);
    transition: transform 0.15s ease;
  }
  .mgmt-task-card:active { transform: scale(0.98); }

  .mgmt-task-card.status-open {
    background: linear-gradient(
      to left,
      rgba(0, 200, 255, 0.16) 0%,
      rgba(0, 200, 255, 0.06) 42%,
      rgba(255, 255, 255, 0.09) 78%
    );
    border-color: rgba(0, 200, 255, 0.24);
  }
  .mgmt-task-card.status-in_progress {
    background: linear-gradient(
      to left,
      rgba(240, 168, 32, 0.18) 0%,
      rgba(240, 168, 32, 0.07) 42%,
      rgba(255, 255, 255, 0.09) 78%
    );
    border-color: rgba(240, 168, 32, 0.26);
  }
  .mgmt-task-card.status-blocked {
    background: linear-gradient(
      to left,
      rgba(255, 85, 85, 0.16) 0%,
      rgba(255, 85, 85, 0.06) 42%,
      rgba(255, 255, 255, 0.09) 78%
    );
    border-color: rgba(255, 85, 85, 0.24);
  }
  .mgmt-task-card.status-done {
    background: linear-gradient(
      to left,
      rgba(0, 230, 118, 0.14) 0%,
      rgba(0, 230, 118, 0.05) 42%,
      rgba(255, 255, 255, 0.09) 78%
    );
    border-color: rgba(0, 230, 118, 0.22);
  }
  .mgmt-task-card.has-report {
    padding-left: 46px;
  }

  .mgmt-task-report-dot {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid rgba(0, 230, 118, 0.45);
    background: linear-gradient(145deg, rgba(0, 230, 118, 0.28), rgba(0, 180, 90, 0.12));
    color: #00e676;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    cursor: pointer;
    box-shadow:
      0 0 14px rgba(0, 230, 118, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    z-index: 2;
  }
  .mgmt-task-report-dot:active {
    transform: translateY(-50%) scale(0.92);
    box-shadow: 0 0 8px rgba(0, 230, 118, 0.35);
  }

  .mgmt-report-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
  }
  .mgmt-report-task-title {
    font-size: 14px;
    font-weight: 800;
    color: #f8faff;
    margin: 0 0 12px;
    line-height: 1.45;
  }
  .mgmt-report-body {
    font-size: 13px;
    color: #c8d4e8;
    line-height: 1.7;
    white-space: pre-wrap;
    background: rgba(0, 0, 0, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 14px;
  }

  .mgmt-task-card.urgent {
    border-color: rgba(251, 113, 133, 0.45);
    box-shadow:
      0 8px 24px rgba(244, 63, 94, 0.15),
      inset 0 1px 0 rgba(255, 200, 210, 0.2);
  }

  .mgmt-task-title { font-size: 14px; font-weight: 800; line-height: 1.45; margin-bottom: 10px; color: #f8faff; }
  .mgmt-task-meta { display: flex; flex-wrap: wrap; gap: 6px; }
  .mgmt-pill {
    font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(8px);
    color: rgba(255, 255, 255, 0.7);
  }
  .mgmt-pill.status-open { color: #00c8ff; border-color: rgba(0,200,255,0.3); }
  .mgmt-pill.status-in_progress { color: #f0a820; border-color: rgba(240,168,32,0.3); }
  .mgmt-pill.status-blocked { color: #ff5555; border-color: rgba(255,85,85,0.3); }
  .mgmt-pill.status-done { color: #00e676; border-color: rgba(0,230,118,0.3); }

  .mgmt-empty {
    text-align: center; padding: 40px 20px; color: #4a6080; font-size: 13px; line-height: 1.6;
  }

  .mgmt-modal-bg {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: rgba(0, 0, 0, 0.62);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding:
      max(env(safe-area-inset-top, 0px), 8px)
      0
      max(env(safe-area-inset-bottom, 0px), 8px);
  }

  @media (min-width: 520px) {
    .mgmt-modal-bg {
      align-items: center;
      padding: 16px;
    }
  }

  .mgmt-modal-sheet {
    width: 100%;
    max-width: 430px;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: rgba(28, 32, 52, 0.88);
    backdrop-filter: blur(48px) saturate(1.9);
    -webkit-backdrop-filter: blur(48px) saturate(1.9);
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 22px 22px 0 0;
    box-shadow:
      0 -8px 40px rgba(0, 0, 0, 0.35),
      inset 0 1px 1px rgba(255, 255, 255, 0.28);
    direction: rtl;
    text-align: right;
  }

  @media (min-width: 520px) {
    .mgmt-modal-sheet {
      max-height: min(85%, 720px);
      border-radius: 22px;
    }
  }

  .mgmt-modal-header {
    flex-shrink: 0;
    position: relative;
    padding: 10px 18px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .mgmt-modal-handle {
    width: 40px;
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.28);
    margin: 0 auto 12px;
  }

  .mgmt-modal-close {
    position: absolute;
    left: 14px;
    top: 14px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
  }

  .mgmt-modal-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 14px 18px 8px;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  .mgmt-modal-footer {
    flex-shrink: 0;
    padding: 12px 18px calc(14px + env(safe-area-inset-bottom, 0));
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.18);
  }

  .mgmt-field { margin-bottom: 14px; }
  .mgmt-field label { display: block; font-size: 11px; color: #6a8098; font-weight: 700; margin-bottom: 6px; }
  .mgmt-input, .mgmt-select, .mgmt-textarea {
    width: 100%; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 12px; color: #e8eeff; font-family: 'Heebo', sans-serif;
    font-size: 14px; outline: none; text-align: right;
  }
  .mgmt-textarea { min-height: 88px; resize: vertical; }

  .mgmt-btn-row { display: flex; gap: 10px; margin-top: 18px; }
  .mgmt-btn-primary, .mgmt-btn-ghost {
    flex: 1; padding: 13px; border-radius: 12px; font-weight: 800; font-size: 14px; cursor: pointer;
    font-family: 'Heebo', sans-serif; border: none;
  }
  .mgmt-btn-primary {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.7), rgba(139, 92, 246, 0.75));
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  }
  .mgmt-btn-ghost {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
  }
  .mgmt-btn-danger {
    flex: 1; padding: 13px; border-radius: 12px; font-weight: 800; font-size: 14px; cursor: pointer;
    font-family: 'Heebo', sans-serif;
    background: rgba(220, 38, 38, 0.2);
    border: 1px solid rgba(255, 85, 85, 0.45);
    color: #ff6b6b;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .mgmt-toast {
    position: fixed;
    top: calc(max(env(safe-area-inset-top, 0px), 44px) + 8px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 300;
    background: rgba(4, 26, 8, 0.92); border: 1px solid rgba(0, 230, 118, 0.4);
    color: #00e676; padding: 12px 18px; border-radius: 12px; font-size: 13px; font-weight: 700;
    backdrop-filter: blur(12px); max-width: 90%;
  }
  .mgmt-toast.warn { background: rgba(26, 4, 4, 0.92); border-color: rgba(255,85,85,0.4); color: #ff5555; }

  .mgmt-profile-card {
    background: rgba(255, 255, 255, 0.09);
    backdrop-filter: blur(32px);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 20px; padding: 20px;
    margin-bottom: 12px;
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2);
  }
  .mgmt-profile-avatar-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 18px;
  }
  .mgmt-profile-avatar-btn {
    position: relative;
    width: 88px;
    height: 88px;
    border-radius: 50%;
    padding: 0;
    border: 2px solid rgba(255, 255, 255, 0.28);
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.45), rgba(139, 92, 246, 0.5));
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25);
    cursor: pointer;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    font-weight: 800;
    color: #e8eeff;
    font-family: 'Heebo', sans-serif;
  }
  .mgmt-profile-avatar-btn:disabled {
    opacity: 0.7;
    cursor: wait;
  }
  .mgmt-profile-avatar-btn img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .mgmt-profile-avatar-badge {
    position: absolute;
    bottom: 2px;
    left: 2px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(5, 1, 15, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: #e8eeff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  }
  .mgmt-profile-avatar-hint {
    margin-top: 10px;
    font-size: 11px;
    color: #6a8098;
    font-weight: 600;
  }
  .mgmt-profile-avatar-remove {
    margin-top: 6px;
    background: none;
    border: none;
    color: #ff6b6b;
    font-family: 'Heebo', sans-serif;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    padding: 4px 8px;
    opacity: 0.85;
  }
  .mgmt-profile-avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    margin: 0 auto 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 800;
    color: #e8eeff;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.45), rgba(139, 92, 246, 0.5));
    border: 1px solid rgba(255, 255, 255, 0.28);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25);
  }
  .mgmt-input-readonly {
    opacity: 0.72;
    cursor: not-allowed;
    background: rgba(0, 0, 0, 0.22) !important;
    border-color: rgba(255, 255, 255, 0.06) !important;
  }
  .mgmt-profile-action-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    margin-bottom: 10px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(16px);
    color: #e8eeff;
    font-family: 'Heebo', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    text-align: right;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
    transition: background 0.15s ease;
  }
  .mgmt-profile-action-btn:active { background: rgba(255, 255, 255, 0.12); }
  .mgmt-profile-action-btn.danger {
    color: #ff6b6b;
    border-color: rgba(255, 107, 107, 0.3);
    background: rgba(220, 38, 38, 0.1);
  }
  .mgmt-profile-action-btn span { flex: 1; }
  .mgmt-profile-action-arrow {
    font-size: 16px;
    opacity: 0.45;
  }
  .mgmt-profile-name { font-size: 18px; font-weight: 800; margin-bottom: 12px; }
  .mgmt-profile-row { font-size: 13px; color: #8aa0c0; margin-bottom: 8px; }

  .mgmt-meeting-card {
    background: rgba(255, 255, 255, 0.09);
    backdrop-filter: blur(32px) saturate(1.6);
    -webkit-backdrop-filter: blur(32px) saturate(1.6);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 20px;
    padding: 14px 16px; margin-bottom: 10px; cursor: pointer;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.2);
  }
  .mgmt-meeting-title { font-size: 14px; font-weight: 800; margin-bottom: 8px; }
  .mgmt-meeting-meta { font-size: 11px; color: #6a8098; display: flex; flex-wrap: wrap; gap: 10px; }

  .mgmt-agenda-item {
    background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px; padding: 12px 14px; margin-bottom: 10px;
  }
  .mgmt-inline-btns { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .mgmt-inline-btn {
    padding: 8px 14px; border-radius: 999px; font-size: 11px; font-weight: 700;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(12px);
    color: #e0e7ff; cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }
`;

function buildStars() {
  return Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    size: `${Math.random() * 2 + 1}px`,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: `${(Math.random() * 2 + 1.5).toFixed(1)}s`,
    delay: `${(Math.random() * 2).toFixed(1)}s`,
  }));
}

export default function ManagementShell({ pageLabel, activeNav, children, hideNav, fab }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const loggedUser = user || sessionStorage.getItem('aragon_logged_user');
  const [stars] = useState(buildStars);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (!loggedUser) return undefined;
    const loadName = () => {
      supabase.from('users').select('full_name').eq('username', loggedUser).single()
        .then(({ data }) => { if (data?.full_name) setDisplayName(data.full_name); });
    };
    loadName();
    const onProfileUpdate = (e) => { if (e.detail?.full_name) setDisplayName(e.detail.full_name); };
    window.addEventListener('mgmt-profile-updated', onProfileUpdate);
    return () => window.removeEventListener('mgmt-profile-updated', onProfileUpdate);
  }, [loggedUser]);

  const handleNav = (tab) => {
    if (tab === 'tasks') navigate('/management');
    else if (tab === 'meetings') navigate('/management/meetings');
    else if (tab === 'profile') navigate('/management/profile');
  };

  return (
    <div className="mgmt-mobile-root">
      <style>{managementMobileStyles}</style>
      <div className="mgmt-mobile-app">
        <div className="mgmt-grid-bg" />
        <div className="mgmt-stars">
          {stars.map(s => (
            <div key={s.id} className="mgmt-star" style={{ width: s.size, height: s.size, left: s.left, top: s.top, '--d': s.duration, animationDelay: s.delay }} />
          ))}
        </div>

        <div className="mgmt-ambient mgmt-ambient-1" />
        <div className="mgmt-ambient mgmt-ambient-2" />
        <div className="mgmt-ambient mgmt-ambient-3" />

        <div className="mgmt-status-gap" aria-hidden="true" />

        <header className="mgmt-top-banner">
          <div className="mgmt-header-row">
            <div className="mgmt-header-text">
              <div className="mgmt-welcome">
                ברוך הבא, <span>{displayName || '...'}</span>
              </div>
              {pageLabel && <div className="mgmt-page-label">{pageLabel}</div>}
            </div>
            <div className="mgmt-logo-wrap">
              <img className="mgmt-logo-img" src={aragonLogo} alt="Aragon" />
            </div>
          </div>
        </header>

        <main className="mgmt-scroll-body">{children}</main>

        {!hideNav && (
          <div className="mgmt-bottom-dock">
            {fab && <div className="mgmt-fab-slot">{fab}</div>}
            <ManagementBottomNav active={activeNav} onChange={handleNav} />
          </div>
        )}

        <div id="mgmt-modal-root" className="mgmt-modal-root" aria-hidden="true" />
      </div>
    </div>
  );
}
