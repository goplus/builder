use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use js_sys::{Array, Uint8Array};
use resvg::usvg::{self, fontdb::ID};
use svgtypes::FontFamily;
use wasm_bindgen::prelude::*;

fn error(message: impl std::fmt::Display) -> JsValue {
    JsValue::from_str(&message.to_string())
}

fn font_has_char(fontdb: &usvg::fontdb::Database, id: ID, character: char) -> bool {
    fontdb
        .with_face_data(id, |data, index| {
            ttf_parser::Face::parse(data, index)
                .map(|face| face.glyph_index(character).is_some())
                .unwrap_or(false)
        })
        .unwrap_or(false)
}

#[wasm_bindgen]
pub struct Renderer {
    fontdb: Arc<usvg::fontdb::Database>,
    aliases: HashMap<String, ID>,
}

#[wasm_bindgen]
impl Renderer {
    #[wasm_bindgen(constructor)]
    pub fn new(font_names: Vec<String>, font_buffers: Array) -> Result<Renderer, JsValue> {
        if font_names.len() != font_buffers.length() as usize {
            return Err(error("font names and buffers must have the same length"));
        }

        let mut fontdb = usvg::fontdb::Database::new();
        let mut aliases = HashMap::new();
        for (name, value) in font_names.into_iter().zip(font_buffers.iter()) {
            let font_data = Uint8Array::new(&value).to_vec();
            let ids = fontdb.load_font_source(usvg::fontdb::Source::Binary(Arc::new(font_data)));
            if let Some(id) = ids.first() {
                aliases.insert(name, *id);
            }
        }

        Ok(Renderer {
            fontdb: Arc::new(fontdb),
            aliases,
        })
    }

    pub fn render(&self, svg: &str) -> Result<Vec<u8>, JsValue> {
        let aliases = self.aliases.clone();
        let fallbacks = Arc::new(Mutex::new(HashMap::<ID, Vec<ID>>::new()));
        let default_select_font = usvg::FontResolver::default_font_selector();
        let default_select_fallback = usvg::FontResolver::default_fallback_selector();
        let options = usvg::Options {
            fontdb: self.fontdb.clone(),
            font_resolver: usvg::FontResolver {
                select_font: {
                    let aliases = aliases.clone();
                    let fallbacks = fallbacks.clone();
                    Box::new(move |font, fontdb| {
                        let candidate_ids = font
                            .families()
                            .iter()
                            .filter_map(|family| match family {
                                FontFamily::Named(name) => aliases.get(name.as_str()).copied(),
                                _ => None,
                            })
                            .collect::<Vec<_>>();
                        if let Some((id, fallback_ids)) = candidate_ids.split_first() {
                            fallbacks.lock().unwrap().insert(*id, fallback_ids.to_vec());
                            return Some(*id);
                        }
                        default_select_font(font, fontdb)
                    })
                },
                select_fallback: {
                    let fallbacks = fallbacks.clone();
                    Box::new(move |character, used_fonts, fontdb| {
                        if let Some(base_font) = used_fonts.first() {
                            if let Some(candidate_ids) =
                                fallbacks.lock().unwrap().get(base_font).cloned()
                            {
                                for id in candidate_ids {
                                    if !used_fonts.contains(&id)
                                        && font_has_char(fontdb, id, character)
                                    {
                                        return Some(id);
                                    }
                                }
                            }
                        }
                        default_select_fallback(character, used_fonts, fontdb)
                    })
                },
            },
            ..usvg::Options::default()
        };

        let tree = usvg::Tree::from_str(svg, &options).map_err(error)?;
        let size = tree.size().to_int_size();
        let mut pixmap = resvg::tiny_skia::Pixmap::new(size.width(), size.height())
            .ok_or_else(|| error("failed to create SVG render target"))?;
        resvg::render(
            &tree,
            resvg::tiny_skia::Transform::default(),
            &mut pixmap.as_mut(),
        );
        pixmap.encode_png().map_err(error)
    }
}
