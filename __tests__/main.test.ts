/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import { wait } from '../__fixtures__/wait.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/wait.js', () => ({ wait }))

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
    // Set the action's inputs as return values from core.getInput().
    core.getInput.mockImplementation((name: string) =>
      name === 'milliseconds' ? '500' : ''
    )

    // Mock the wait function so that it does not actually wait.
    wait.mockImplementation(() => Promise.resolve('done!'))
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('Sets the time output', async () => {
    await run()

    // Verify the time output was set.
    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      'time',
      // Simple regex to match a time string in the format HH:MM:SS.
      expect.stringMatching(/^\d{2}:\d{2}:\d{2}/)
    )
  })

  it('Sets a failed status', async () => {
    // Clear the getInput mock and return an invalid value.
    core.getInput.mockClear().mockReturnValueOnce('this is not a number')

    // Clear the wait mock and return a rejected promise.
    wait
      .mockClear()
      .mockRejectedValueOnce(new Error('milliseconds is not a number'))

    await run()

    // Verify that the action was marked as failed.
    expect(core.setFailed).toHaveBeenNthCalledWith(
      1,
      'milliseconds is not a number'
    )
  })

  it('Allows .tgz file input', async () => {
    core.getInput.mockImplementation((name: string) =>
      name === 'milliseconds' ? '500' : 'archive.tgz'
    )

    await run()

    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      'time',
      expect.stringMatching(/^\d{2}:\d{2}:\d{2}/)
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('Allows uppercase .tgz file input', async () => {
    core.getInput.mockImplementation((name: string) =>
      name === 'milliseconds' ? '500' : 'archive.TGZ'
    )

    await run()

    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      'time',
      expect.stringMatching(/^\d{2}:\d{2}:\d{2}/)
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('Sets a failed status for unsupported file input', async () => {
    core.getInput.mockImplementation((name: string) =>
      name === 'milliseconds' ? '500' : 'archive.zip'
    )

    await run()

    expect(core.setFailed).toHaveBeenNthCalledWith(
      1,
      'only .tgz files are supported: archive.zip'
    )
    expect(wait).not.toHaveBeenCalled()
  })

  it('Sets a failed status for invalid .tgz filename', async () => {
    core.getInput.mockImplementation((name: string) =>
      name === 'milliseconds' ? '500' : '.tgz'
    )

    await run()

    expect(core.setFailed).toHaveBeenNthCalledWith(
      1,
      'only .tgz files are supported: .tgz'
    )
    expect(wait).not.toHaveBeenCalled()
  })

  it('Sets a failed status for .tgz substring in the middle', async () => {
    core.getInput.mockImplementation((name: string) =>
      name === 'milliseconds' ? '500' : 'archive.tgz.bak'
    )

    await run()

    expect(core.setFailed).toHaveBeenNthCalledWith(
      1,
      'only .tgz files are supported: archive.tgz.bak'
    )
    expect(wait).not.toHaveBeenCalled()
  })
})
