import test from 'node:test'
import assert from 'node:assert/strict'
import {droppedReferenceImage,imageUrlFromDraggedHtml,referenceImageDragAvailable,referenceImageFile} from './referenceImageDrop20261028.js'

const transfer = (data,files=[]) => ({
  files,
  types: [...Object.keys(data),...(files.length?['Files']:[])],
  getData: type => data[type] || '',
})

test('Google Images HTML drop extracts thumbnail image, never the results page link',()=>{
  const html='<a href="https://www.google.com/imgres?imgurl=abc"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ABC&amp;w=500"></a>'
  assert.equal(imageUrlFromDraggedHtml(html),'https://encrypted-tbn0.gstatic.com/images?q=tbn:ABC&w=500')
  assert.equal(droppedReferenceImage(transfer({'text/html':html,'text/uri-list':'https://www.google.com/imgres?imgurl=abc'})),
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ABC&w=500')
})

test('image files override URL/HTML metadata; rejects unsupported image and ordinary links',()=>{
  const file={name:'board-photo.png',type:'image/png',size:125}
  assert.equal(droppedReferenceImage(transfer({'text/html':'<img src="https://example.com/another.jpg">'},[file])),file)
  assert.equal(referenceImageDragAvailable(transfer({},[file])),true)
  assert.equal(referenceImageFile({name:'danger.svg',type:'image/svg+xml'}),false)
  assert.equal(droppedReferenceImage(transfer({'text/plain':'https://www.google.com/search?q=coat'})),null)
  assert.equal(imageUrlFromDraggedHtml('<img src="javascript:alert(1)">'),null)
})

test('direct image URL drop accepts common photographic formats and image hosts',()=>{
  assert.equal(droppedReferenceImage(transfer({'text/uri-list':'https://example.com/design.webp?size=large'})),
    'https://example.com/design.webp?size=large')
  assert.equal(droppedReferenceImage(transfer({'text/plain':'https://lh3.googleusercontent.com/example-token'})),
    'https://lh3.googleusercontent.com/example-token')
  assert.equal(droppedReferenceImage(transfer({'text/plain':'file:///Users/example/Desktop/image.png'})),null)
  assert.equal(droppedReferenceImage(transfer({'text/uri-list':'https://images.example.org/photo?token=abc'})),
    'https://images.example.org/photo?token=abc')
  assert.equal(imageUrlFromDraggedHtml('<img src="//images.example.org/photo?id=1">'),
    'https://images.example.org/photo?id=1')
})
