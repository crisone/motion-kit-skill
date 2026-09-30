"""PDF extraction/search in page coordinates. No OCR or semantic matching is claimed."""
import sys,json,unicodedata
from pathlib import Path
import fitz

def normalized(s):
    return ''.join(c for c in unicodedata.normalize('NFKC',s).casefold() if not c.isspace() and c not in '-\u00ad\u2010\u2011').replace('’', "'").replace('‘', "'").replace('“','"').replace('”','"')

def extract(path):
    doc=fitz.open(path)
    if doc.needs_pass: raise ValueError('PDF 已加密，请先提供解密后的副本。')
    pages=[]
    for page in doc:
        chars=[]; text=[]; lid=0
        for block in page.get_text('rawdict',sort=False)['blocks']:
            if 'lines' not in block: continue
            for line in block['lines']:
                for span in line['spans']:
                    for ch in span['chars']:
                        r=fitz.Rect(ch['bbox'])*page.rotation_matrix
                        chars.append({'c':ch['c'],'b':[round(v,3) for v in r],'l':lid})
                        text.append(ch['c'])
                text.append('\n');lid+=1
        pages.append({'number':page.number+1,'width':page.rect.width,'height':page.rect.height,'text':''.join(text),'chars':chars})
    return {'title':doc.metadata.get('title') or Path(path).stem,'pageCount':len(pages),'pages':pages,'warnings':['第 %s 页没有可检索文字，可能需要 OCR。'%p['number'] for p in pages if len(p['text'].strip())<10]}

def search(index,query,page_number=None):
    q=normalized(query)
    if len(q)<3: raise ValueError('请至少输入 3 个有效字符。')
    matches=[];total=0
    for page in index['pages']:
        if page_number and page['number']!=page_number:continue
        seq=[];mapping=[]
        for i,ch in enumerate(page['chars']):
            part=normalized(ch['c']);seq.append(part);mapping.extend([i]*len(part))
        text=''.join(seq);start=0
        while True:
            start=text.find(q,start)
            if start<0:break
            first,last=mapping[start],mapping[start+len(q)-1];picked=page['chars'][first:last+1]
            lines={}
            for ch in picked:
                if ch['c'].isspace():continue
                r=ch['b'];k=ch['l']
                if k not in lines:lines[k]=list(r)
                else:
                    old=lines[k];lines[k]=[min(old[0],r[0]),min(old[1],r[1]),max(old[2],r[2]),max(old[3],r[3])]
            rects=[{'x':r[0],'y':r[1],'width':r[2]-r[0],'height':r[3]-r[1]} for r in lines.values()]
            actual='';prev=None
            for ch in picked:
                if prev is not None and prev!=ch['l']:actual+='\n'
                actual+=ch['c'];prev=ch['l']
            if len(matches)<40:matches.append({'page':page['number'],'startChar':first,'endChar':last,'quote':actual,'rects':rects,'method':'normalized-text','context':''.join(c['c'] for c in page['chars'][max(0,first-100):min(len(page['chars']),last+101)])})
            total+=1;start+=max(1,len(q))
    return {'query':query,'matches':matches,'total':total,'truncated':total>40,'warnings':index.get('warnings',[]),'note':'匹配忽略空白、连字符和大小写；未进行语义推断。'}

def main():
    action=sys.argv[1]
    if action=='extract': out=extract(sys.argv[2])
    elif action=='search':
        args=json.load(sys.stdin);out=search(json.loads(Path(sys.argv[2]).read_text()),args['query'],args.get('page'))
    elif action=='render':
        doc=fitz.open(sys.argv[2]);page=doc[int(sys.argv[3])-1];scale=min(4,3200/max(page.rect.width,page.rect.height));page.get_pixmap(matrix=fitz.Matrix(scale,scale),alpha=False).save(sys.argv[4]);out={'ok':True}
    else:raise ValueError('Unknown command')
    print(json.dumps(out,ensure_ascii=False))

if __name__=='__main__':
    try:main()
    except Exception as e:
        print(json.dumps({'error':str(e)},ensure_ascii=False),file=sys.stderr);sys.exit(1)
