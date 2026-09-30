import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from pdf import search

def page(lines):
 chars=[]
 for l,text in enumerate(lines):
  for i,c in enumerate(text): chars.append({'c':c,'l':l,'b':[i*5,l*12,i*5+5,l*12+10]})
 return {'number':1,'chars':chars}
class SearchTests(unittest.TestCase):
 def test_multiline_hyphenation(self):
  r=search({'pages':[page(['A trans-','former uses attention.'])]},'A transformer uses attention.')
  self.assertEqual(r['total'],1);self.assertEqual(len(r['matches'][0]['rects']),2)
 def test_duplicates_remain_ambiguous(self):
  r=search({'pages':[page(['attention attention'])]},'attention');self.assertEqual(r['total'],2)
 def test_ligature(self):
  r=search({'pages':[page(['ﬁnal result'])]},'final result');self.assertEqual(r['total'],1)
 def test_no_guess(self):
  self.assertEqual(search({'pages':[page(['observed result'])]},'unobserved result')['total'],0)
 def test_chinese_line_breaks(self):
  self.assertEqual(search({'pages':[page(['注意力机制','提高效率'])]},'注意力机制提高效率')['total'],1)
if __name__=='__main__':unittest.main()
