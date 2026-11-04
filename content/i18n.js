"use client"
import { useSyncExternalStore } from "react"
import * as fr from "./portfolio"
import * as en from "./portfolio.en"

// La langue du site : un petit magasin auquel les composants s'abonnent.
// Changer de langue refait le rendu des textes seulement, jamais celui du Canvas 3D.
const KEY = "portfolio:lang"
const CONTENT = { fr, en }
let lang = "fr"
const listeners = new Set()

export const contentFor = (value) => CONTENT[value] ?? fr

export function setLang(value) {
  lang = value
  document.documentElement.lang = value
  try {
    localStorage.setItem(KEY, value)
  } catch {
    // stockage indisponible : le choix vaut jusqu'au rechargement
  }
  listeners.forEach((listener) => listener())
}

// Au chargement : le dernier choix du visiteur, sinon la langue de son navigateur
export function initLang() {
  let saved = null
  try {
    saved = localStorage.getItem(KEY)
  } catch {}
  setLang(saved === "fr" || saved === "en" ? saved : navigator.language?.startsWith("fr") ? "fr" : "en")
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const getLang = () => lang
export const useLang = () => useSyncExternalStore(subscribe, getLang, () => "fr")
export const useContent = () => contentFor(useLang())
