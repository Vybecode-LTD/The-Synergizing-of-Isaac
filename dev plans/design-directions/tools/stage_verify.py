"""Stage the boards and their uploaded sprites for the local harness: verify/<board>.dc.html, verify/_blob/<id>."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

IDS = {
    "item-118.png": "b23bbe7f39de27e4a7a078acff0487a5", "item-38.png": "8a9a8bc7b77cf6b399c4e87e7a913a4d",
    "item-68.png": "93bb336fbdd0921b22a0210b77204c70", "item-562.png": "8627f4c9af1259775a480cfecdd973fb",
    "item-415.png": "b8be76cf3ab3bca6001f575a2188bb08", "item-182.png": "e20266ac8fb94dce7317acaaacc661ad",
    "item-149.png": "fad8d1805d16ce75571f964f4a5fed51", "item-330.png": "df32a1523ab1bec318a69918669c854c",
    "item-168.png": "fbfa9f13fabe1f6474a043a1102d9261", "item-531.png": "d5e32910f7dbff817f37aecbf1385d31",
    "item-573.png": "b0d1bbf229c3ccc536e3abd931d396ce", "item-114.png": "f788695d033f6d7f087a74ebfc8f16f0",
    "item-169.png": "6485c53fe9839a73f61089493e1cebb1", "item-481.png": "0c42f64fe0910b1849320194298ed17f",
    "item-395.png": "a45e4598f23e318271c5f08e011342ac", "item-82.png": "34d511ca38a21d8df990e3967d460ed0",
    "item-80.png": "146dcb04781d22c1d52e5a161192e629", "item-579.png": "701fffbaf0e65b20b81bffd9093e3774",
    "item-245.png": "e70136fdc2582145405091d7c504d11f", "item-81.png": "c5db645757ffc1b3f463b3060c6917a2",
    "item-212.png": "ce4b16fb388676de8647fbc5fc0110ac", "item-145.png": "c44bda023f23f976eb6eff725344fe4c",
    "item-133.png": "2dacfff9cd75453e4b57211bd06136f4", "item-134.png": "3892422f28194438db067faa776f2e0f",
    "item-619.png": "99e4812084f14866de98545bd61e2764", "item-584.png": "ada255821b62750173fa98e34a66091d",
    "item-357.png": "606a3c6e26a73c97a8a9567264717abd", "item-356.png": "db0829ad0314a524bab9e60ad385252b",
    "trinket-145.png": "154017cedf3f046fdcbe6e87d73168d3", "char-isaac.webp": "b498ff35dffeaff0bc5f72665e90767a",
    "char-magdalene.webp": "0e3222f382c4a2659586681689dd1ec9", "char-azazel.webp": "98f8f8866e83eb48625d620f61680060",
    "char-the-lost.webp": "b1b02e0e1dd1711b50e0b4a8b40d0660", "char-lilith.webp": "360a20fb5f3bc477009baff3230b900a",
    "char-bethany.webp": "3a29ab7d9b76407b3fcaaeaa74da3d1e",
}


def main() -> int:
    canvas = Path(sys.argv[1])
    verify = Path(sys.argv[2])
    blob = verify / "_blob"
    blob.mkdir(parents=True, exist_ok=True)
    for name, blob_id in IDS.items():
        shutil.copyfile(canvas / "uploads" / name, blob / blob_id)
    for board in (canvas / "project").glob("*.dc.html"):
        shutil.copyfile(board, verify / board.name)
    print(len(IDS), "sprites,", len(list(verify.glob("*.dc.html"))), "boards")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
