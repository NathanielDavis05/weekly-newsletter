import { useRef, useState } from 'react';
import { addAsset, deleteAsset } from '../../store/actions/theme';
import { setSetting } from '../../store/actions/elements';
import { useDoc } from '../../store/docStore';
import { useEditor } from '../../store/editorStore';
import { Icon } from '../Icon';
import { Tooltip } from '../controls/Tooltip';
import { TextField } from '../controls/Fields';

/** Reads a file into a data URL so assets survive a refresh with the document. */
export function readFileAsDataUrl(file: File): Promise<{ src: string; width?: number; height?: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const src = reader.result as string;
      if (!file.type.startsWith('image/')) return resolve({ src });
      const img = new Image();
      img.onload = () => resolve({ src, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ src });
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export function AssetsPanel() {
  const assets = useDoc((s) => s.doc.assets);
  const selection = useEditor((s) => s.selection);
  const doc = useDoc((s) => s.doc);
  const toast = useEditor((s) => s.toast);
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');

  const list = Object.values(assets).sort((a, b) => b.createdAt - a.createdAt);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      // localStorage is the persistence layer, so very large files would blow
      // the quota and silently lose work. Better to say so up front.
      if (file.size > 3_000_000) {
        toast(`“${file.name}” is over 3 MB — use a URL instead`, 'error');
        continue;
      }
      const { src, width, height } = await readFileAsDataUrl(file);
      addAsset({
        name: file.name,
        src,
        type: file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'file',
        width,
        height,
        size: file.size,
      });
    }
  };

  const applyToSelection = (src: string) => {
    const target = selection.filter((id) => {
      const t = doc.elements[id]?.type;
      return t === 'image' || t === 'logo';
    });
    if (!target.length) {
      toast('Select an image element first', 'info');
      return;
    }
    setSetting(target, 'src', src, { label: 'Set image' });
  };

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Assets</span>
        <Tooltip label="Upload images">
          <button type="button" className="btn icon" onClick={() => inputRef.current?.click()}>
            <Icon name="upload" size={14} />
          </button>
        </Tooltip>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          void upload(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="panel-body">
        <div style={{ padding: '8px 8px 4px', display: 'flex', gap: 4 }}>
          <div style={{ flex: 1 }}>
            <TextField value={url} onChange={setUrl} placeholder="Paste an image URL" />
          </div>
          <button
            type="button"
            className="btn outline"
            disabled={!url.trim()}
            onClick={() => {
              addAsset({ name: url.split('/').pop() || 'Image', src: url.trim(), type: 'image' });
              setUrl('');
            }}
          >
            Add
          </button>
        </div>

        {list.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 8 }}>
            {list.map((a) => (
              <div
                key={a.id}
                style={{
                  border: '1px solid var(--ui-border)',
                  borderRadius: 5,
                  overflow: 'hidden',
                  background: 'var(--ui-panel-2)',
                  cursor: 'pointer',
                }}
                title={`${a.name} — click to apply to the selected image`}
                onClick={() => applyToSelection(a.src)}
              >
                <div style={{ height: 68, background: '#0e1014', display: 'grid', placeItems: 'center' }}>
                  {a.type === 'image' ? (
                    <img
                      src={a.src}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <Icon name="video" size={20} style={{ opacity: 0.5 }} />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 5px' }}>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 10.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--ui-text-dim)',
                    }}
                  >
                    {a.name}
                  </span>
                  <button
                    type="button"
                    style={{ color: 'var(--ui-text-faint)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAsset(a.id);
                    }}
                  >
                    <Icon name="trash" size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-note">
            No assets yet. Upload images or paste a URL, then click an asset to drop it into the selected
            image element.
          </div>
        )}
      </div>
    </>
  );
}
