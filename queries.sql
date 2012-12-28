SELECT addons.id, addons.guid, files.jetpack_version
FROM addons 
INNER JOIN versions ON versions.addon_id = addons.id 
INNER JOIN files ON versions.id = files.version_id 
WHERE addons.created = versions.created
AND addons.guid LIKE 'jid%';

SELECT addons.id, addons.guid, files.jetpack_version
FROM addons 
INNER JOIN versions ON versions.addon_id = addons.id 
INNER JOIN files ON versions.id = files.version_id 
WHERE addons.created = versions.created
AND files.jetpack_version IS NOT NULL;

SELECT addons.id, addons.guid, addons.slug, 
versions.id, addons.created,  files.created
FROM addons 
INNER JOIN versions ON versions.addon_id = addons.id 
INNER JOIN files ON versions.id = files.version_id 
AND files.platform_id = 1 
AND addons.guid LIKE 'jid%'
AND files.jetpack_version IS NULL
AND versions.id = addons.current_version;

-- need tag-based query?
SELECT a.id as addon_id, v.id as verison_id, f.filename
FROM `users_tags_addons` as uta 
INNER JOIN `addons` as a ON uta.addon_id = a.id 
INNER JOIN `versions` as v ON v.addon_id = a.id
INNER JOIN `files` as f ON f.version_id = v.id
WHERE `tag_id` = 7758
AND v.`id` = a.`current_version`
AND a.inactive = 0 
AND a.status NOT IN (0, 5,10) ;