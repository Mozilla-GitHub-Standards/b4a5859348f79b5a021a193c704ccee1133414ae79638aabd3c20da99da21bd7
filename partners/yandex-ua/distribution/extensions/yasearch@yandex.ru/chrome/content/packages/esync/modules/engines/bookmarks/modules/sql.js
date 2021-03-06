let EXPORTED_SYMBOLS = [
    "QUERIES",
    "STORAGE_QUERIES",
    "TRIGGER_FUNCTION_NAME"
];
let TRIGGER_FUNCTION_NAME = "bookmarkHasSameId";
let QUERIES = {
    ATTACH_STORAGE_DB: "ATTACH :path AS yaEsyncBookmarksStorage;",
    DETACH_STORAGE_DB: "DETACH database yaEsyncBookmarksStorage;",
    SELECT_ALL_BOOKMARKS: [
        "SELECT b.id AS itemId, b.parent AS parentId, b.title AS title, p.url AS url, ",
        "b.type, b.dateAdded, b.lastModified, b.position, ",
        "s.title AS storageTitle, s.parent_browser_id AS storageParentId, ",
        "s.browser_id AS storageId, s.url AS storageUrl, ",
        "s.id_string AS id_string, s.version AS version, ",
        "s.browser_position AS browser_position, s.position_in_parent AS position_in_parent ",
        "FROM moz_bookmarks AS b ",
        "LEFT JOIN moz_places AS p ",
        "ON p.id = b.fk ",
        "LEFT OUTER JOIN yaEsyncBookmarksStorage.Bookmarks AS s ",
        "ON s.browser_id = b.id ",
        "UNION ALL ",
        "SELECT b.id AS itemId, b.parent AS parentId, b.title AS title, p.url AS url, ",
        "b.type, b.dateAdded, b.lastModified, b.position, ",
        "s.title AS storageTitle, s.parent_browser_id AS storageParentId, ",
        "s.browser_id AS storageId, s.url AS storageUrl, ",
        "s.id_string AS id_string, s.version AS version, s.browser_position AS browser_position, ",
        "s.position_in_parent AS position_in_parent ",
        "FROM yaEsyncBookmarksStorage.Bookmarks AS s ",
        "LEFT OUTER JOIN moz_bookmarks AS b ",
        "ON b.id = s.browser_id ",
        "LEFT JOIN moz_places AS p ",
        "ON p.id = b.fk ",
        "WHERE itemId IS NULL;"
    ].join(""),
    SELECT_SPECIFIC_BOOKMARK: [
        "SELECT b.id AS itemId, b.parent AS parentId, b.title AS title, p.url AS url, ",
        "b.type, b.dateAdded, b.lastModified, b.position ",
        "FROM moz_bookmarks AS b ",
        "LEFT JOIN moz_places AS p ",
        "ON p.id = b.fk ",
        "WHERE itemId = :browser_id;"
    ].join(""),
    SELECT_BOOKMARKS_BY_PARENT: [
        "SELECT b.id AS itemId, b.parent AS parentId, b.title AS title, p.url AS url, ",
        "b.type, b.dateAdded, b.lastModified, b.position ",
        "FROM moz_bookmarks AS b ",
        "LEFT JOIN moz_places AS p ",
        "ON p.id = b.fk ",
        "WHERE parentId = :browser_id;"
    ].join(""),
    CREATE_TRIGGER: [
        "CREATE TRIGGER IF NOT EXISTS insert_bookmark_record ",
        "BEFORE INSERT ON record ",
        "WHEN NEW.engine = 'Bookmarks' ",
        "BEGIN ",
        "SELECT CASE ",
        "(SELECT max(res) FROM ",
        "(SELECT " + TRIGGER_FUNCTION_NAME + "(data, NEW.data) AS res FROM ",
        "(SELECT data FROM record WHERE engine = 'Bookmarks' AND processing = 0))) ",
        "WHEN 1 ",
        "THEN ",
        "RAISE(IGNORE) ",
        "END; ",
        "END;"
    ].join(""),
    DROP_TRIGGER: "DROP TRIGGER IF EXISTS insert_bookmark_record;"
};
let STORAGE_QUERIES = {
    INIT_ENGINE_TABLE: [
        "CREATE TABLE IF NOT EXISTS Bookmarks ( ",
        "id_string VARCHAR PRIMARY KEY, ",
        "parent_id_string VARCHAR, ",
        "originator_cache_guid VARCHAR, ",
        "position_in_parent INTEGER, ",
        "server_defined_unique_tag VARCHAR, ",
        "version INTEGER, ",
        "ctime DATETIME, ",
        "mtime DATETIME, ",
        "folder BOOLEAN, ",
        "url TEXT, ",
        "favicon BLOB, ",
        "title TEXT, ",
        "creation_time_us DATETIME, ",
        "icon_url TEXT, ",
        "browser_id INTEGER, ",
        "parent_browser_id INTEGER, ",
        "browser_position INTEGER",
        ");"
    ].join(""),
    INSERT_DATA: [
        "INSERT OR REPLACE INTO Bookmarks (",
        "id_string, ",
        "parent_id_string, ",
        "originator_cache_guid, ",
        "position_in_parent, ",
        "server_defined_unique_tag, ",
        "version, ",
        "ctime, ",
        "mtime, ",
        "folder, ",
        "url, ",
        "favicon, ",
        "title, ",
        "creation_time_us, ",
        "icon_url, ",
        "browser_id, ",
        "parent_browser_id, ",
        "browser_position ",
        ") VALUES (",
        ":id_string, ",
        ":parent_id_string, ",
        ":originator_cache_guid, ",
        ":position_in_parent, ",
        ":server_defined_unique_tag, ",
        ":version, ",
        ":ctime, ",
        ":mtime, ",
        ":folder, ",
        ":url, ",
        ":favicon, ",
        ":title, ",
        ":creation_time_us, ",
        ":icon_url, ",
        ":browser_id, ",
        ":parent_browser_id, ",
        ":browser_position ",
        ");"
    ].join(""),
    DROP_ENGINE_TABLE: "DROP TABLE IF EXISTS Bookmarks;"
};
