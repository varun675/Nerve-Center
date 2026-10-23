// Real public data: images from the Construction Site Safety dataset
// (Roboflow Universe, CC BY 4.0) and detection results produced offline
// with an open-source YOLO11n PPE model run through ONNX Runtime.
import data from './realData.json'
import img006463 from '../assets/site/006463.jpg'
import imgPpe1073 from '../assets/site/ppe_1073.jpg'
import img006672 from '../assets/site/006672.jpg'
import img002551 from '../assets/site/002551.jpg'
import imgYoutube462 from '../assets/site/youtube_462.jpg'

const IMAGES = {
  '006463.jpg': img006463,
  'ppe_1073.jpg': imgPpe1073,
  '006672.jpg': img006672,
  '002551.jpg': img002551,
  'youtube_462.jpg': imgYoutube462,
}

export const REAL = {
  stats: data.stats,
  totals: data.totals,
  gallery: data.gallery.map((g) => ({ ...g, src: IMAGES[g.image] })),
}
