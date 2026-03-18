from pathlib import Path
path = Path('frontend/pages/AccessControl.tsx')
text = path.read_text()
    setSelectedMember(member);
    const url = `/admin/grand-access?memberId=${member.id}`;
    window.open(url, '_blank', 'noopener');
ECHO is on.
  const openGrandAccess = (member: User) =
    setSelectedMember(member);
    navigate(`/admin/grand-access?memberId=${member.id}`);
path.write_text(text.replace(old, new, 1))
