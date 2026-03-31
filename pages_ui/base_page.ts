import type { Page } from '@playwright/test';
import { PARABANK_BASE_URL } from '../const_data/base-url';

/** Options for {@link Page.goto} (load, domcontentloaded, networkidle, commit). */
export type PageGotoOptions = NonNullable<Parameters<Page['goto']>[1]>;

/**
 * Shared root for ParaBank UI page objects. Subclasses call {@link open} for in-app navigation.
 */
export abstract class BasePage {
  protected constructor(protected readonly page: Page) {}

  protected async open(relativePath = '', options?: PageGotoOptions): Promise<void> {
    const base = `${PARABANK_BASE_URL}/`;
    const href = new URL(relativePath.trim() || '.', base).href;
    await this.page.goto(href, options);
  }
}
