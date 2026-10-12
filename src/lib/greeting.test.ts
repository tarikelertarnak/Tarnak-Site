import { describe, expect, it } from 'vitest'
import { helloFor, helloMessage } from './greeting'

/**
 * Boş sohbetteki "Merhaba de!" düğmesinin gönderdiği selamlama
 * (2026-10-12 kullanıcı isteği): dil site dilinden, yoksa İngilizce.
 */
describe('greeting — selamlama dili', () => {
  it('bilinen diller kendi selamlamasını verir', () => {
    expect(helloFor('tr')).toBe('Merhaba')
    expect(helloFor('en')).toBe('Hello')
    expect(helloFor('de')).toBe('Hallo')
    expect(helloFor('fr')).toBe('Bonjour')
    expect(helloFor('es')).toBe('Hola')
    expect(helloFor('it')).toBe('Ciao')
    expect(helloFor('pt')).toBe('Olá')
    expect(helloFor('ru')).toBe('Привет')
    expect(helloFor('ar')).toBe('مرحبا')
    expect(helloFor('ja')).toBe('こんにちは')
    expect(helloFor('zh')).toBe('你好')
    expect(helloFor('ko')).toBe('안녕하세요')
  })

  it('bölge ekli ve büyük harfli kodlar normalize edilir', () => {
    expect(helloFor('tr-TR')).toBe('Merhaba')
    expect(helloFor('EN-US')).toBe('Hello')
    expect(helloFor('ja_JP')).toBe('こんにちは')
  })

  it('bilinmeyen/boş dil → İngilizce "Hello"', () => {
    expect(helloFor('xx')).toBe('Hello')
    expect(helloFor('')).toBe('Hello')
    expect(helloFor(null)).toBe('Hello')
    expect(helloFor(undefined)).toBe('Hello')
  })

  it('gönderilen mesaj biçimi "{selam} 👋"', () => {
    expect(helloMessage('tr')).toBe('Merhaba 👋')
    expect(helloMessage('xx')).toBe('Hello 👋')
  })
})
