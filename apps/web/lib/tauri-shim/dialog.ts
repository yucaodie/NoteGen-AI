// Tauri Plugin Dialog -> Browser confirm/prompt

export async function confirm(message: string, options?: { title?: string; kind?: 'info' | 'warning' | 'error' }): Promise<boolean> {
  return window.confirm(message);
}

export async function ask(message: string, options?: { title?: string; kind?: 'info' | 'warning' | 'error' }): Promise<boolean> {
  return window.confirm(message);
}

export async function message(message: string, options?: { title?: string; kind?: 'info' | 'warning' | 'error' }): Promise<void> {
  window.alert(message);
}

export async function open(options?: {
  multiple?: boolean;
  directory?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
  title?: string;
}): Promise<string | string[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (options?.multiple) input.multiple = true;
    if (options?.filters) {
      input.accept = options.filters.map((f) => f.extensions.map((e) => `.${e}`).join(',')).join(',');
    }
    input.onchange = () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) { resolve(null); return; }
      if (options?.multiple) resolve(files.map((f) => f.name));
      else resolve(files[0].name);
    };
    input.click();
  });
}

export async function save(options?: {
  defaultPath?: string;
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}): Promise<string | null> {
  return window.prompt('保存为:', options?.defaultPath || '');
}
