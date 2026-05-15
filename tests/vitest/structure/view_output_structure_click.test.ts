import { describe, expect, it } from 'vitest'
import { parse_xyz, parse_poscar } from '$lib/structure/parse'
import cyclohexane from '$site/molecules/cyclohexane.xyz?raw'

// Simulate what NodeStatusPanel.svelte does at click time.
function sniff_and_parse(mlp_contcar: string) {
  const first_line = mlp_contcar.split(/\r?\n/, 1)[0] ?? ''
  const is_xyz = /^\s*\d+\s*$/.test(first_line)
  return { is_xyz, parsed: is_xyz ? parse_xyz(mlp_contcar) : parse_poscar(mlp_contcar) }
}

describe('NodeStatusPanel View Structure click handler', () => {
  it('parses cyclohexane.xyz (mimics ORCA NEB-TS converged.xyz)', () => {
    const { is_xyz, parsed } = sniff_and_parse(cyclohexane)
    expect(is_xyz).toBe(true)
    expect(parsed).not.toBeNull()
    expect(parsed!.sites?.length).toBe(18)
  })

  it('handles leading whitespace on atom count', () => {
    const padded = '   18\n' + cyclohexane.split('\n').slice(1).join('\n')
    const { is_xyz, parsed } = sniff_and_parse(padded)
    expect(is_xyz).toBe(true)
    expect(parsed).not.toBeNull()
  })

  it('handles CRLF line endings', () => {
    const crlf = cyclohexane.replace(/\n/g, '\r\n')
    const { is_xyz, parsed } = sniff_and_parse(crlf)
    expect(is_xyz).toBe(true)
    expect(parsed).not.toBeNull()
    expect(parsed!.sites?.length).toBe(18)
  })

  it('handles trailing newline', () => {
    const { is_xyz, parsed } = sniff_and_parse(cyclohexane + '\n')
    expect(is_xyz).toBe(true)
    expect(parsed).not.toBeNull()
    expect(parsed!.sites?.length).toBe(18)
  })

  it('still parses POSCAR via parse_poscar branch', () => {
    const poscar = `Cu test\n1.0\n3.6 0 0\n0 3.6 0\n0 0 3.6\nCu\n4\nDirect\n0 0 0\n0.5 0.5 0\n0.5 0 0.5\n0 0.5 0.5\n`
    const { is_xyz, parsed } = sniff_and_parse(poscar)
    expect(is_xyz).toBe(false)
    expect(parsed).not.toBeNull()
  })
})
