---
title: Parquet with GEOMETRY type is not GeoParquet
tags: parquet, geoparquet, geospatial, wkb, hyparquet, standards
date: 2025-09-25
---

[Parquet](https://parquet.apache.org/) is a column-oriented storage file format I love to use in web apps, because I can access large datasets from a remote location without loading the entire file into memory. Several JavaScript libraries allow reading remote Parquet files: [DuckDB-WASM](https://github.com/duckdb/duckdb-wasm), [Parquet WASM](kylebarron.dev/parquet-wasm/) or [hyparquet](https://github.com/hyparam/hyparquet) which I regularly contribute to.

[GeoParquet](https://geoparquet.org/) is an extension of Parquet that defines how to store geospatial data.

In this blog post, which takes the form of an FAQ, I try to clarify the differences between GeoParquet and Parquet with its new `GEOMETRY` and `GEOGRAPHY`.

_edit (2025-10-03): I updated parts of this post, after Chris Holmes pointed out that I had misunderstood the chronology. GeoParquet's last version was actually 9 months before the new types, and the goal for GeoParquet is to "go native"._

## TL;DR

My general understanding is that the two standards are orthogonal, compatible, and can be combined, with the only caveat that the columns must be encoded as `WKB`.

The differences between the two standards are summarized in the table below.

| Feature                                | Parquet with GEOMETRY/GEOGRAPHY                                                                                                                                                                                                                     | GeoParquet                                                                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Location                               | Columns logical types, and row group level geospatial statistics                                                                                                                                                                                    | `geo` field in file metadata                                                                                                                                    |
| Logical type of `BYTE_ARRAY`           | `GEOMETRY`, `GEOGRAPHY`                                                                                                                                                                                                                             | None                                                                                                                                                            |
| Encoding                               | WKB                                                                                                                                                                                                                                                 | WKB or Arrow native types                                                                                                                                       |
| Primary geospatial column              | No                                                                                                                                                                                                                                                  | Yes                                                                                                                                                             |
| Coordinate Reference System (CRS)      | Column level, optional                                                                                                                                                                                                                              | Column level, optional                                                                                                                                          |
| Epoch (dynamic CRS year)               | No                                                                                                                                                                                                                                                  | Column level, optional                                                                                                                                          |
| Geometry types                         | Row group level, optional                                                                                                                                                                                                                           | Column level, mandatory                                                                                                                                         |
| Column bounding box                    | Row group level, optional                                                                                                                                                                                                                           | Column level, optional                                                                                                                                          |
| Covering (link to bounding box column) | No                                                                                                                                                                                                                                                  | Column level, optional                                                                                                                                          |
| Edges (planar/spherical)               | Column level (`GEOMETRY` / `GEOGRAPHY`), mandatory                                                                                                                                                                                                  | Column level, optional                                                                                                                                          |
| Polygon orientation                    | No                                                                                                                                                                                                                                                  | Column level, optional                                                                                                                                          |
| Versions compared                      | Introduced in [2.11.0 (March 2025)](https://github.com/apache/parquet-format/releases/tag/apache-parquet-format-2.11.0), last version is [2.12.0 (August 2025)](https://github.com/apache/parquet-format/releases/tag/apache-parquet-format-2.12.0) | [1.1.0 (June 2024)](https://github.com/opengeospatial/geoparquet/releases/tag/v1.1.0%2Bp1)                                                                      |
| Implementations                        | See [Parquet implementations compliance table](https://parquet.apache.org/docs/file-format/implementationstatus/) (does not include GEOMETRY/GEOGRAPHY yet)                                                                                         | See [list of GeoParquet implementations](https://geoparquet.org/#implementations)                                                                               |
| References                             | [Website](https://parquet.apache.org/), [Specification](https://github.com/apache/parquet-format), [Thrift](https://github.com/apache/parquet-format/blob/master/src/main/thrift/parquet.thrift)                                                    | [Website](https://geoparquet.org/), [Specification](https://geoparquet.org/releases/v1.1.0/), [JSON Schema](https://geoparquet.org/releases/v1.1.0/schema.json) |
| Example file | TODO | [GeoParquet example file](https://source-cooperative.github.io/parquet-table/?lens=metadata&url=https%3A%2F%2Fraw.githubusercontent.com%2Fopengeospatial%2Fgeoparquet%2Fmain%2Fexamples%2Fexample.parquet) |

## What is the GEOMETRY type?

The support for the GEOMETRY type in Parquet only brings [two changes to the standard](https://github.com/apache/parquet-format/pull/240/files#diff-834c5a8d91719350b20995ad99d1cb6d8d68332b9ac35694f40e375bdb2d3e7c).

### Logical type

Logical types in Parquet are a way to add semantic meaning to primitive types. They are defined in the Parquet "schema", the part of the metadata that lists the columns and their characteristics. `GEOMETRY` is a new logical type for the primitive type `BYTE_ARRAY`, and has an optional parameter to define the CRS (Coordinate Reference System) of the column.

The data in the GEOMETRY columns must be encoded in [WKB](https://en.wikipedia.org/wiki/Well-known_text_representation_of_geometry#Well-known_binary) (Well-Known Binary), a binary format to represent geometric objects defined by the [OGC](https://www.ogc.org/) (Open Geospatial Consortium). Note that the axis order is explicitly `(x,y)` and cannot be overridden by the CRS.

### Statistics

Apart from the logical type in the schema, the new version also includes optional geospatial statistics in the column metadata at the row group level. The aim is to speed up geospatial queries by filtering out row groups that do not intersect with the query's bounding box.

The geospatial statistics can include two optional fields.

The first optional statistic is a bounding box that gives the minimum and maximum coordinates of all the geometries in the column chunk. Note that it includes x, y, but also z and m if present.

The second optional statistics is the list of geospatial types present in the column chunk (e.g., `Point`, `Polygon`, `MultiLineString`, etc.) There is no way to define a specific geometry type for the column, unlike GeoParquet. It's done at the row group level.

## What is the GEOGRAPHY type?

`GEOGRAPHY` can be seen as an extension of `GEOMETRY` for the sphere. The only difference in the standard is an additional optional parameter for the logical type, which gives the algorithm used for edge interpolation on the sphere.

## When were GEOMETRY and GEOGRAPHY added to Parquet?

Since May of 2024, the maintainers of both projects have discussed how to support geospatial data natively in Parquet. You can do archeology in [PARQUET-2471](https://github.com/apache/parquet-format/pull/240). Nice discussion, more than 400 comments, 40 revisions, 15 participants (nearly all men, btw).

It culminated with the addition of the `GEOMETRY` and `GEOGRAPHY` logical types in the Parquet format, formally released in March of 2025 with version [2.11.0](https://github.com/apache/parquet-format/releases/tag/apache-parquet-format-2.11.0) of the Parquet format.

## Are GeoParquet and Parquet with GEOMETRY the same thing?

No. Parquet with `GEOMETRY` and `GEOGRAPHY` is the new version of the Parquet standard. GeoParquet is an extension of Parquet, which is thus compatible, and adds more features.

_edit (2025-10-03): but the plan for GeoParquet 2.0 is to be Parquet with GEOMETRY/GEOGRAPHY. See these two blog posts by Chris Holmes: ["Geoparquet 2.0: Going Native"](https://cloudnativegeo.org/blog/2025/02/geoparquet-2.0-going-native/), ["GeoParquet & Parquet geospatial types: A time of transition"](https://cholmes.medium.com/geoparquet-parquet-geospatial-types-a-time-of-transition-a42e391cdab2)._

## Is GeoParquet deprecated?

No. It's still an active standard<strike>, and a [version](https://geoparquet.org/releases/v1.1.0/) was published three months after the introduction of `GEOMETRY` and `GEOGRAPHY` in Parquet</strike>.

_edit (2025-10-03): I misread the year! Version v1.1.0 was actually published 9 months before, and the plan for Geoparquet is to "go native". Sorry about that, and thanks for Chris Holmes for noticing!_

## Does GeoParquet use the GEOMETRY and GEOGRAPHY logical types in Parquet?

No. The [GeoParquet 1.1.0 standard](https://geoparquet.org/releases/v1.1.0/), published <strike>three months after</strike> nine months before the introduction of `GEOMETRY` and `GEOGRAPHY` in Parquet, does not yet mention these logical types or the new geospatial statistics.

_edit (2025-10-03): see above!_

## What are the differences between GeoParquet and Parquet with GEOMETRY?

<strike>The two standards seem to have diverged, even if the GeoParquet maintainers participated in the creation of the `GEOMETRY` logical type in Parquet.</strike>

_edit (2025-10-03): see above! The two standards have not diverged, I misunderstood, and the plan for GeoParquet is to "go native"._

### No overlap

GeoParquet does not mention the new logical types and geospatial statistics. All GeoParquet features are included in a `geo` field in the file metadata, which is not part of the Parquet standard.

### GeoParquet features

GeoParquet has many features that are not in Parquet with `GEOMETRY`.

A GeoParquet file must include a `geo` field, encoded as JSON, in the file metadata. This object contains the GeoParquet version and the name of the primary geospatial column. Parquet has no concept of such a "primary" geospatial column.

The same `geo` metadata must also include a list of column metadata for each geospatial column in the file.

Each column metadata mandatorily includes the encoding, which might be WKB or a native Arrow type, called `point`, `linestring`, `polygon`, etc. This means that the binary data in the columns is not necessarily WKB as in Parquet.

It also includes the list of geometry types present in the column (e.g., `Point`, `Polygon`, etc.) It's done for the entire column, while in Parquet with `GEOMETRY`, it's optional and done at the row group level.

The column metadata can also include the CRS (feature parity with Parquet, but not located in the schema).

The difference between planar and spherical data is given by the "edges" field (`spherical` or `planar`). It is complemented by the orientation field that must be `counterclockwise` or undefined, and gives the orientation of polygon rings. Parquet uses the logical type to differentiate between planar (`GEOMETRY`) and spherical (`GEOGRAPHY`) data. It has no concept of orientation, and it gives more details for the GEOGRAPHY logical type by defining how to interpolate edges on the sphere.

GeoParquet still has several additional features at the column level that have no equivalent in Parquet.

It can include a bounding box for the entire column, which is very handy to get an immediate idea of the data extent. I created a small tool, called ["Hello Foursquare places"](https://observablehq.com/@severo/hello-foursquare-places), that uses that information to quickly find which of the 100 GeoParquet files published by Foursquare contains a specific area.

You can also see a specialized field, called `epoch`, which gives the year of the CRS when it's a dynamic one. It surely helps in some edge cases.

Finally, a recent addition to the column metadata is `covering`, which maps a geospatial column to a bounding box column, which can help to speed up queries. If I read correctly, it's limited to the x and y dimensions. I'm not yet sure what the tradeoffs are between using `covering` in GeoParquet and using geospatial statistics in Parquet with `GEOMETRY`.

## Are they compatible?

Yes! It's the good news. As the two standards are orthogonal, you can combine them, with only one caveat: the columns must be encoded as `WKB`.

Otherwise, the files can be written with both the `geo` metadata (GeoParquet), and the `GEOMETRY`/`GEOGRAPHY` logical types + geospatial statistics (Parquet).

## How to read them?

As the two standards are orthogonal, their features can be read and interpreted independently of each other. The only caveat is that the columns must be encoded as `WKB` to be compatible with both standards, and I imagine that Parquet takes precedence over GeoParquet. So, if a GeoParquet file defines an Arrow native encoding, while the column is marked as a `GEOMETRY` logical type in the schema, a reader should raise an error.

## What is the support in libraries?

I have no clear idea of how the libraries write Parquet files that include geospatial data, and how they support reading both formats. If you want to investigate, you can consult the [list of GeoParquet implementations](https://geoparquet.org/#implementations) and the [Parquet implementations compliance table](https://parquet.apache.org/docs/file-format/implementationstatus/) (which unfortunately does not include `GEOMETRY`, `GEOGRAPHY `, and the geospatial statistics).

### and in hyparquet?

[hyparquet](https://github.com/hyparam/hyparquet) does not yet support reading `GEOMETRY` and `GEOGRAPHY`, or the geospatial statistics. It has two companion projects: [geoparquet](https://github.com/hyparam/geoparquet), which reads GeoParquet, and [hyparquet-writer](https://github.com/hyparam/hyparquet-writer), which writes Parquet in JavaScript. The [plan](https://github.com/hyparam/hyparquet/issues/124) is to improve the support for geospatial data in hyparquet. Time to start coding!

_edit (2025-10-03): hyparquet now supports reading `GEOMETRY` and `GEOGRAPHY`._

## Conclusion

Parquet with `GEOMETRY` and `GEOGRAPHY` is not GeoParquet. The two standards are orthogonal and compatible, and can be combined, with the caveat that the columns must be encoded as `WKB`. GeoParquet has more features, while Parquet with `GEOMETRY` and `GEOGRAPHY` brings native support for geospatial data in the Parquet format. The new geospatial additions in Parquet seem too recent to have had widespread adoption.

Do you have comments? Did I misunderstand something? Do you know if Parquet and GeoParquet will merge at some point? Please reach out on [Mastodon](https://mastodon.social/@severo/) or [LinkedIn](https://www.linkedin.com/in/sylvain--lesage/).
